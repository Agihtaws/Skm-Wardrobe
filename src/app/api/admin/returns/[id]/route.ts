import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, serverError } from "@/lib/api-response";
import Razorpay from "razorpay";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id }     = await params;
    const { status } = await request.json();
    const admin      = createAdminClient();

    // Fetch return request + linked order
    const { data: ret } = await admin
      .from("return_requests")
      .select("order_id, refund_amount, razorpay_refund_id")
      .eq("id", id)
      .single();

    if (!ret) return err("Return request not found", 404);

    // ── Mark Refunded ──────────────────────────────────────────────────
    if (status === "refunded") {

      // Fetch order to get payment details + payment method
      const { data: order } = await admin
        .from("orders")
        .select("razorpay_payment_id, payment_method, total")
        .eq("id", ret.order_id)
        .single();

      if (!order) return err("Order not found", 404);

      let razorpayRefundId: string | null = null;

      // ── Online payment → trigger Razorpay refund ──
      if (order.payment_method === "online" && order.razorpay_payment_id) {

        // Don't double-refund
        if (ret.razorpay_refund_id) {
          console.log("[Returns] Refund already issued:", ret.razorpay_refund_id);
        } else {
          try {
            const razorpay = new Razorpay({
              key_id:     process.env.RAZORPAY_KEY_ID!,
              key_secret: process.env.RAZORPAY_KEY_SECRET!,
            });

            const refundAmount = Math.round(
              Number(ret.refund_amount ?? order.total) * 100  // paise
            );

            const refund = await razorpay.payments.refund(
              order.razorpay_payment_id,
              {
                amount: refundAmount,
                speed:  "normal",        // "normal" = 5-7 days, "optimum" = instant (costs extra)
                notes:  {
                  reason:   "Customer return approved",
                  order_id: ret.order_id,
                },
              }
            );

            razorpayRefundId = refund.id;
            console.log("[Returns] Razorpay refund created:", refund.id, "amount:", refundAmount);

          } catch (rzpErr: any) {
            console.error("[Returns] Razorpay refund failed:", rzpErr?.error ?? rzpErr);
            // Don't block the DB update — admin can retry from Razorpay dashboard
            // but log prominently so admin knows
            console.error("[Returns] ⚠️ Manual refund needed for payment:", order.razorpay_payment_id);
          }
        }
      }
      // ── COD → no Razorpay refund, admin does manual bank/UPI transfer ──
      else if (order.payment_method === "cod") {
        console.log("[Returns] COD order — manual refund required for order:", ret.order_id);
      }

      // Update return request
      await admin
        .from("return_requests")
        .update({
          status,
          updated_at:        new Date().toISOString(),
          ...(razorpayRefundId ? { razorpay_refund_id: razorpayRefundId } : {}),
        })
        .eq("id", id);

      // Update order status
      await admin
        .from("orders")
        .update({ status: "refunded", return_status: "refunded" })
        .eq("id", ret.order_id);

      // Restore stock
      const { data: items } = await admin
        .from("order_items")
        .select("product_id, variant_id, quantity")
        .eq("order_id", ret.order_id);

      for (const item of items ?? []) {
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

      return ok({
        updated:            true,
        payment_method:     order.payment_method,
        razorpay_refund_id: razorpayRefundId,
        // Tell admin UI whether manual action is needed
        manual_refund_needed: order.payment_method === "cod",
      });
    }

    // ── Other status updates (approved, picked, rejected) ─────────────
    await admin
      .from("return_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    return ok({ updated: true });

  } catch (e) {
    return serverError(e);
  }
}