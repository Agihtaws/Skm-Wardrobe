import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ok, err, unauthorized, serverError } from "@/lib/api-response";
import { sendEmail, emailPaymentConfirmed } from "@/lib/email";
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

    // ── Verify Razorpay signature ──────────────────────────────────────
    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return err("Payment verification failed", 400);
    }

    const admin = createAdminClient();

    // ── Fetch order with items (including variant_id) ──────────────────
    const { data: order } = await admin
      .from("orders")
      .select("*, items:order_items(product_id, variant_id, quantity, product_name, price_at_time, size)")
      .eq("id", order_id)
      .single();

    if (!order) return err("Order not found", 404);

    // ── Update order to paid ───────────────────────────────────────────
    await admin
      .from("orders")
      .update({
        status:              "paid",
        razorpay_payment_id,
        razorpay_signature,
      })
      .eq("id", order_id);

    // ── Decrement stock (variant-aware) ────────────────────────────────
    for (const item of order.items ?? []) {
      if (item.variant_id) {
        // Has size variant → decrement variant stock
        const { data: variant } = await admin
          .from("product_variants")
          .select("stock")
          .eq("id", item.variant_id)
          .single();

        if (variant) {
          await admin
            .from("product_variants")
            .update({ stock: Math.max(0, variant.stock - item.quantity) })
            .eq("id", item.variant_id);
        }

        // Also update parent product stock (sum of variants)
        const { data: allVariants } = await admin
          .from("product_variants")
          .select("stock")
          .eq("product_id", item.product_id);

        if (allVariants) {
          const totalStock = allVariants.reduce((s, v) => s + v.stock, 0);
          await admin
            .from("products")
            .update({ stock: totalStock })
            .eq("id", item.product_id);
        }
      } else {
        // No variant → decrement product stock directly
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
    }

    // ── Clear cart ─────────────────────────────────────────────────────
    await admin.from("cart").delete().eq("user_id", user.id);

    // ── Send confirmation email ────────────────────────────────────────
    if (user.email) {
      const customerName = user.user_metadata?.full_name ?? "there";
      await sendEmail(
        user.email,
        "Payment confirmed — SKM Wardrobe",
        emailPaymentConfirmed({
          orderId:       order_id,
          customerName,
          total:         Number(order.total),
          paymentMethod: "online",
          items:         (order.items ?? []).map((i: any) => ({
            name:  i.product_name,
            qty:   i.quantity,
            price: Number(i.price_at_time),
            size:  i.size,
          })),
        })
      );
    }

    return ok({ order_id, verified: true });
  } catch (e) {
    return serverError(e);
  }
}