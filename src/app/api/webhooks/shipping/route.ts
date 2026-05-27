import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  sendEmail,
  emailOrderProcessing,
  emailOrderShipped,
  emailOrderDelivered,
  emailOrderCancelled,
} from "@/lib/email";

const STATUS_MAP: Record<string, string> = {
  "NEW":                "processing",
  "PENDING":            "processing",
  "PICKUP SCHEDULED":   "processing",
  "PICKUP GENERATED":   "processing",
  "PICKUP QUEUED":      "processing",
  "MANIFEST GENERATED": "processing",
  "SHIPPED":            "shipped",
  "IN TRANSIT":         "shipped",
  "OUT FOR DELIVERY":   "shipped",
  "DELIVERED":          "delivered",
  "RTO INITIATED":      "cancelled",
  "RTO DELIVERED":      "cancelled",
  "CANCELLED":          "cancelled",
  "LOST":               "cancelled",
};

export async function POST(request: Request) {
  try {
    const token = request.headers.get("x-api-key");
    if (token !== process.env.SHIPROCKET_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const srStatus     = (body.current_status ?? body.status ?? "").toUpperCase().trim();
    const mappedStatus = STATUS_MAP[srStatus];

    if (!mappedStatus) {
      return NextResponse.json({ received: true, skipped: `unmapped status: ${srStatus}` });
    }

    const admin        = createAdminClient();
    const srInternalId = body.sr_order_id ?? body.SR_Order_Id;

    let order: any = null;

    // Find order by Shiprocket internal ID
    if (srInternalId) {
      const { data } = await admin
        .from("orders")
        .select("id, status, user_id, delhivery_awb, shiprocket_awb")
        .eq("shiprocket_order_id", String(srInternalId))
        .single();
      order = data;
    }

    // Fallback: find by shipment_id
    if (!order && body.shipment_id) {
      const { data } = await admin
        .from("orders")
        .select("id, status, user_id, delhivery_awb, shiprocket_awb")
        .eq("shiprocket_shipment_id", String(body.shipment_id))
        .single();
      order = data;
    }

    if (!order) {
      return NextResponse.json({ received: true, skipped: "no matching order" });
    }

    // Skip if status hasn't changed
    if (mappedStatus === order.status) {
      return NextResponse.json({ received: true, skipped: "status unchanged" });
    }

    // Update order status
    await admin.from("orders").update({ status: mappedStatus }).eq("id", order.id);

    // Restore stock on RTO
    if (mappedStatus === "cancelled" && srStatus.includes("RTO")) {
      await restoreStock(admin, order.id);
    }

    console.log(`[Webhook] Order ${order.id}: ${order.status} → ${mappedStatus}`);

    // ── Send status email to customer ──────────────────────────────────
    try {
      // Get customer email
      const { data: authUser } = await admin.auth.admin.getUserById(order.user_id);
      const customerEmail = authUser?.user?.email;
      const customerName  = authUser?.user?.user_metadata?.full_name ?? "there";
      const awb           = body.awb ?? body.AWB ?? order.delhivery_awb ?? order.shiprocket_awb;

      if (customerEmail) {
        if (mappedStatus === "processing") {
          await sendEmail(
            customerEmail,
            "Your order is being packed — SKM Wardrobe",
            emailOrderProcessing(order.id, customerName)
          );
        } else if (mappedStatus === "shipped") {
          await sendEmail(
            customerEmail,
            "Your order has been shipped — SKM Wardrobe",
            emailOrderShipped(order.id, customerName, awb)
          );
        } else if (mappedStatus === "delivered") {
          await sendEmail(
            customerEmail,
            "Your order has been delivered — SKM Wardrobe",
            emailOrderDelivered(order.id, customerName)
          );
        } else if (mappedStatus === "cancelled") {
          await sendEmail(
            customerEmail,
            "Order cancelled — SKM Wardrobe",
            emailOrderCancelled(
              order.id,
              customerName,
              srStatus.includes("RTO")
                ? "Your package was returned to us by the courier. Our team will contact you shortly."
                : undefined
            )
          );
        }
      }
    } catch (emailErr) {
      console.error("[Webhook] Email failed:", emailErr);
      // Don't fail the webhook response
    }

    return NextResponse.json({ received: true, updated: mappedStatus });

  } catch (e) {
    console.error("[Webhook Error]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function restoreStock(admin: any, orderId: string) {
  try {
    const { data: items } = await admin
      .from("order_items")
      .select("product_id, variant_id, quantity")
      .eq("order_id", orderId);

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
    console.log(`[Webhook] Stock restored for order ${orderId}`);
  } catch (e) {
    console.error("[Webhook] Stock restore failed:", e);
  }
}