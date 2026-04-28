import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ok, err, unauthorized, serverError } from "@/lib/api-response";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const {
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await request.json();

    // Verify signature
    const body      = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected  = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return err("Payment verification failed", 400);
    }

    const admin = createAdminClient();

    // Fetch order + items to decrement stock
    const { data: order } = await admin
      .from("orders")
      .select("*, items:order_items(product_id, quantity)")
      .eq("id", order_id)
      .single();

    if (!order) return err("Order not found", 404);

    // Update order to paid
    await admin
      .from("orders")
      .update({
        status:              "paid",
        razorpay_payment_id,
        razorpay_signature,
      })
      .eq("id", order_id);

    // Decrement stock
    for (const item of order.items ?? []) {
      const { data: product } = await admin
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single();

      if (product) {
        await admin
          .from("products")
          .update({ stock: Math.max(0, product.stock - item.quantity) })
          .eq("id", item.product_id);
      }
    }

    // Clear cart
    await admin.from("cart").delete().eq("user_id", user.id);

    return ok({ order_id, verified: true });
  } catch (e) {
    return serverError(e);
  }
}