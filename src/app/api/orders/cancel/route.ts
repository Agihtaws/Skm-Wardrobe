import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { order_id } = await request.json();
    if (!order_id) return err("order_id required");

    const admin = createAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select("*, items:order_items(product_id, variant_id, quantity)")  // ✅ added variant_id
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single();

    if (!order)                                      return err("Order not found", 404);
    if (!["pending", "paid"].includes(order.status)) return err("This order cannot be cancelled");

    // ✅ Updated: restore variant stock if applicable
    for (const item of order.items ?? []) {
      if (item.variant_id) {
        const { data: variant } = await admin
          .from("product_variants")
          .select("stock")
          .eq("id", item.variant_id)
          .single();
        if (variant) {
          await admin
            .from("product_variants")
            .update({ stock: variant.stock + item.quantity })
            .eq("id", item.variant_id);
        }
      } else {
        const { data: product } = await admin
          .from("products")
          .select("stock")
          .eq("id", item.product_id)
          .single();
        if (product) {
          await admin
            .from("products")
            .update({ stock: product.stock + item.quantity })
            .eq("id", item.product_id);
        }
      }
    }

    await admin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order_id);

    return ok({ cancelled: true });
  } catch (e) {
    return serverError(e);
  }
}