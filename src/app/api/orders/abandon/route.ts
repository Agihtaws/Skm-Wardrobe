import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, unauthorized, serverError } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const { order_id } = body;
    if (!order_id) return err("order_id required");

    const admin = createAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select("id, status, user_id, razorpay_order_id")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single();

    if (!order) return ok({ abandoned: false, reason: "not found" });

    // Only delete pending online orders
    if (order.status === "pending" && order.razorpay_order_id) {
      await admin.from("order_items").delete().eq("order_id", order_id);
      await admin.from("orders").delete().eq("id", order_id);
      return ok({ abandoned: true });
    }

    return ok({ abandoned: false, reason: "not eligible" });
  } catch (e) {
    return serverError(e);
  }
}