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

    // Log everything Shiprocket sends — check in Vercel logs
    console.log("[Shipping Webhook]", JSON.stringify({
      awb:            body.awb ?? body.AWB,
      current_status: body.current_status ?? body.status,
      courier:        body.courier_name,
      order_id:       body.order_id,
      shipment_id:    body.shipment_id,
      timestamp:      new Date().toISOString(),
    }));

    const awb          = body.awb ?? body.AWB;
    const srStatus     = (body.current_status ?? body.status ?? "").toUpperCase().trim();
    const courierName  = body.courier_name ?? body.CourierName ?? "";
    const srOrderId    = body.order_id ?? body.SR_Order_Id;
    const mappedStatus = STATUS_MAP[srStatus];

    if (!mappedStatus) {
      return NextResponse.json({
        received: true,
        skipped:  `unmapped status: ${srStatus}`,
      });
    }

    const admin = createAdminClient();

    // Try finding order by AWB first
    if (awb) {
      const { data: orderByAWB } = await admin
        .from("orders")
        .select("id, status, payment_method")
        .or(`shiprocket_awb.eq.${awb},delhivery_awb.eq.${awb}`)
        .single();

      if (orderByAWB) {
        if (mappedStatus !== orderByAWB.status) {
          await admin.from("orders").update({
            status:         mappedStatus,
            shiprocket_awb: awb,
            delhivery_awb:  awb,
            courier_name:   courierName,
          }).eq("id", orderByAWB.id);

          // If RTO (return to origin) — restore stock
          if (["cancelled"].includes(mappedStatus) && srStatus.includes("RTO")) {
            await restoreStock(admin, orderByAWB.id);
          }

          console.log(`[Webhook] Updated order ${orderByAWB.id}: ${orderByAWB.status} → ${mappedStatus}`);
        }
        return NextResponse.json({ received: true, updated: mappedStatus });
      }
    }

    // Try finding by Shiprocket order ID
    if (srOrderId) {
      const { data: orderBySR } = await admin
        .from("orders")
        .select("id, status")
        .eq("shiprocket_order_id", String(srOrderId))
        .single();

      if (orderBySR && mappedStatus !== orderBySR.status) {
        await admin.from("orders").update({
          status:         mappedStatus,
          shiprocket_awb: awb ?? null,
          delhivery_awb:  awb ?? null,
          courier_name:   courierName,
        }).eq("id", orderBySR.id);

        if (["cancelled"].includes(mappedStatus) && srStatus.includes("RTO")) {
          await restoreStock(admin, orderBySR.id);
        }

        console.log(`[Webhook] Updated by SR ID ${srOrderId}: → ${mappedStatus}`);
      }
    }

    return NextResponse.json({ received: true, updated: mappedStatus });
  } catch (e) {
    console.error("[Webhook Error]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Restore stock when order is RTO'd or cancelled via webhook
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