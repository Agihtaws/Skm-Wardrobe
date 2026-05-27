import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, serverError } from "@/lib/api-response";
import { sendEmail, emailRefunded } from "@/lib/email";
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

    const { data: ret } = await admin
      .from("return_requests")
      .select("order_id, refund_amount, razorpay_refund_id, user_id")
      .eq("id", id)
      .single();

    if (!ret) return err("Return request not found", 404);

    // ── Mark Refunded ──────────────────────────────────────────────────
    if (status === "refunded") {
      const { data: order } = await admin
        .from("orders")
        .select("razorpay_payment_id, payment_method, total, user_id")
        .eq("id", ret.order_id)
        .single();

      if (!order) return err("Order not found", 404);

      let razorpayRefundId: string | null = null;

      // Online payment → trigger Razorpay refund
      if (order.payment_method === "online" && order.razorpay_payment_id && !ret.razorpay_refund_id) {
        try {
          const razorpay = new Razorpay({
            key_id:     process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
          });

          const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
            amount: Math.round(Number(ret.refund_amount ?? order.total) * 100),
            speed:  "normal",
            notes:  { reason: "Customer return approved", order_id: ret.order_id },
          });

          razorpayRefundId = refund.id;
          console.log("[Returns] Razorpay refund created:", refund.id);
        } catch (rzpErr: any) {
          console.error("[Returns] Razorpay refund failed:", rzpErr?.error ?? rzpErr);
        }
      }

      // Update return request
      await admin.from("return_requests").update({
        status,
        updated_at: new Date().toISOString(),
        ...(razorpayRefundId ? { razorpay_refund_id: razorpayRefundId } : {}),
      }).eq("id", id);

      // Update order status
      await admin.from("orders")
        .update({ status: "refunded", return_status: "refunded" })
        .eq("id", ret.order_id);

      // Restore stock (variant-aware)
      const { data: items } = await admin
        .from("order_items")
        .select("product_id, variant_id, quantity")
        .eq("order_id", ret.order_id);

      for (const item of items ?? []) {
        if (item.variant_id) {
          const { data: variant } = await admin
            .from("product_variants").select("stock").eq("id", item.variant_id).single();
          if (variant) {
            await admin.from("product_variants")
              .update({ stock: variant.stock + item.quantity })
              .eq("id", item.variant_id);
          }
          const { data: allVariants } = await admin
            .from("product_variants").select("stock").eq("product_id", item.product_id);
          if (allVariants) {
            await admin.from("products")
              .update({ stock: allVariants.reduce((s: number, v: any) => s + v.stock, 0) })
              .eq("id", item.product_id);
          }
        } else {
          const { data: product } = await admin
            .from("products").select("stock").eq("id", item.product_id).single();
          if (product) {
            await admin.from("products")
              .update({ stock: product.stock + item.quantity })
              .eq("id", item.product_id);
          }
        }
      }

      // Send refund email to customer
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(order.user_id);
        const customerEmail = authUser?.user?.email;
        const customerName  = authUser?.user?.user_metadata?.full_name ?? "there";

        if (customerEmail) {
          await sendEmail(
            customerEmail,
            "Your refund has been initiated — SKM Wardrobe",
            emailRefunded(
              ret.order_id,
              customerName,
              Number(ret.refund_amount ?? order.total),
              order.payment_method === "online"
            )
          );
        }
      } catch (emailErr) {
        console.error("[Returns] Email failed:", emailErr);
      }

      return ok({
        updated:              true,
        payment_method:       order.payment_method,
        razorpay_refund_id:   razorpayRefundId,
        manual_refund_needed: order.payment_method === "cod",
      });
    }

    // ── Other status updates (approved, picked, rejected) ─────────────
    await admin.from("return_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    return ok({ updated: true });
  } catch (e) {
    return serverError(e);
  }
}