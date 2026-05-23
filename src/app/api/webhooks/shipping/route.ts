import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

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

    console.log("[Shipping Webhook] Raw body:", JSON.stringify({
      awb:            body.awb ?? body.AWB,
      current_status: body.current_status ?? body.status,
      courier:        body.courier_name,
      order_id:       body.order_id,        // our custom ID e.g. "D3A44367-ABC123"
      sr_order_id:    body.sr_order_id,     // Shiprocket's internal numeric ID
      shipment_id:    body.shipment_id,
      timestamp:      new Date().toISOString(),
    }));

    const srStatus     = (body.current_status ?? body.status ?? "").toUpperCase().trim();
    const mappedStatus = STATUS_MAP[srStatus];

    if (!mappedStatus) {
      return NextResponse.json({ received: true, skipped: `unmapped status: ${srStatus}` });
    }

    const admin = createAdminClient();

    // ✅ Use Shiprocket's internal numeric ID — matches what we store in shiprocket_order_id
    const srInternalId = body.sr_order_id ?? body.SR_Order_Id;

    if (srInternalId) {
      const { data: order } = await admin
        .from("orders")
        .select("id, status")
        .eq("shiprocket_order_id", String(srInternalId))
        .single();

      if (order) {
        if (mappedStatus !== order.status) {
          await admin
            .from("orders")
            .update({ status: mappedStatus })   // ✅ only update status, no tracking fields
            .eq("id", order.id);

          // Restore stock on RTO
          if (mappedStatus === "cancelled" && srStatus.includes("RTO")) {
            await restoreStock(admin, order.id);
          }

          console.log(`[Webhook] Order ${order.id}: ${order.status} → ${mappedStatus}`);
        }
        return NextResponse.json({ received: true, updated: mappedStatus });
      }
    }

    // Fallback — try by shipment_id
    const shipmentId = body.shipment_id;
    if (shipmentId) {
      const { data: order } = await admin
        .from("orders")
        .select("id, status")
        .eq("shiprocket_shipment_id", String(shipmentId))
        .single();

      if (order && mappedStatus !== order.status) {
        await admin
          .from("orders")
          .update({ status: mappedStatus })
          .eq("id", order.id);

        if (mappedStatus === "cancelled" && srStatus.includes("RTO")) {
          await restoreStock(admin, order.id);
        }

        console.log(`[Webhook] Order by shipment ${shipmentId}: → ${mappedStatus}`);
        return NextResponse.json({ received: true, updated: mappedStatus });
      }
    }

    console.log("[Webhook] No matching order found");
    return NextResponse.json({ received: true, skipped: "no matching order" });

  } catch (e) {
    console.error("[Webhook Error]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function restoreStock(admin: any, orderId: string) {
  try {
    const { data: items } = await admin
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);

    for (const item of items ?? []) {
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
    console.log(`[Webhook] Stock restored for order ${orderId}`);
  } catch (e) {
    console.error("[Webhook] Stock restore failed:", e);
  }
}