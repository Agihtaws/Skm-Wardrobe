import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Shiprocket status → your order status mapping
const STATUS_MAP: Record<string, string> = {
  "NEW":                  "processing",
  "PENDING":              "processing",
  "PICKUP SCHEDULED":     "processing",
  "PICKUP GENERATED":     "processing",
  "PICKUP QUEUED":        "processing",
  "MANIFEST GENERATED":   "processing",
  "SHIPPED":              "shipped",
  "IN TRANSIT":           "shipped",
  "OUT FOR DELIVERY":     "shipped",
  "DELIVERED":            "delivered",
  "RTO INITIATED":        "cancelled",
  "RTO DELIVERED":        "cancelled",
  "CANCELLED":            "cancelled",
  "LOST":                 "cancelled",
};

export async function POST(request: Request) {
  try {
    // Verify webhook token
    const token = request.headers.get("x-api-key");
    if (token !== process.env.SHIPROCKET_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("[Shiprocket Webhook]", JSON.stringify(body, null, 2));

    const awb          = body.awb ?? body.AWB;
    const srStatus     = (body.current_status ?? body.status ?? "").toUpperCase();
    const courierName  = body.courier_name ?? body.CourierName ?? "";
    const mappedStatus = STATUS_MAP[srStatus];

    if (!awb) {
      return NextResponse.json({ received: true, skipped: "no awb" });
    }

    const admin = createAdminClient();

    // Find order by AWB or Shiprocket AWB
    const { data: order } = await admin
      .from("orders")
      .select("id, status")
      .or(`shiprocket_awb.eq.${awb},delhivery_awb.eq.${awb}`)
      .single();

    if (!order) {
      // Try to find by shiprocket_order_id
      const srOrderId = body.order_id ?? body.SR_Order_Id;
      if (srOrderId) {
        const { data: orderBySR } = await admin
          .from("orders")
          .select("id, status")
          .eq("shiprocket_order_id", String(srOrderId))
          .single();

        if (orderBySR && mappedStatus) {
          await admin.from("orders").update({
            status:           mappedStatus,
            shiprocket_awb:   awb,
            courier_name:     courierName,
            delhivery_awb:    awb, // reuse tracking field
          }).eq("id", orderBySR.id);
        }
      }
      return NextResponse.json({ received: true });
    }

    if (mappedStatus && mappedStatus !== order.status) {
      await admin.from("orders").update({
        status:        mappedStatus,
        shiprocket_awb: awb,
        courier_name:   courierName,
        delhivery_awb:  awb,
      }).eq("id", order.id);

      console.log(`[Webhook] Order ${order.id} → ${mappedStatus}`);
    }

    return NextResponse.json({ received: true, updated: mappedStatus });
  } catch (e) {
    console.error("[Webhook Error]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}