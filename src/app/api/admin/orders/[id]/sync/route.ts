import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, notFound, serverError } from "@/lib/api-response";
import { srFetch } from "@/lib/shiprocket";

const SR_TO_STATUS: Record<string, string> = {
  // Order-level statuses (from /orders/show)
  "NEW":               "processing",
  "PENDING":           "processing",
  "PROCESSING":        "processing",
  "PICKUP SCHEDULED":  "processing",
  "PICKUP GENERATED":  "processing",
  "MANIFEST GENERATED":"processing",
  "SHIPPED":           "shipped",
  "IN TRANSIT":        "shipped",
  "OUT FOR DELIVERY":  "shipped",
  "DELIVERED":         "delivered",
  "CANCELLED":         "cancelled",
  "CANCEL":            "cancelled",
  "RTO":               "cancelled",
  "RTO INITIATED":     "cancelled",
  "RTO DELIVERED":     "cancelled",
  "LOST":              "cancelled",
  "RETURN PENDING":    "cancelled",
};

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const admin  = createAdminClient();

    // Fetch order from DB
    const { data: order } = await admin
      .from("orders")
      .select("id, status, shiprocket_order_id, shiprocket_shipment_id")
      .eq("id", id)
      .single();

    if (!order) return notFound("Order");
    if (!order.shiprocket_order_id) return err("No Shiprocket order linked to this order");

    // Fetch order details from Shiprocket
    const srRes = await srFetch(`/orders/show/${order.shiprocket_order_id}`);

    console.log("[Sync] Shiprocket response:", JSON.stringify(srRes));

    // Shiprocket returns data.data array
    const srOrder = srRes?.data?.[0] ?? srRes?.data ?? srRes;

    if (!srOrder) return err("Could not fetch order from Shiprocket");

    // Get the status from Shiprocket response
    const rawStatus = (
      srOrder.status ??
      srOrder.order_status ??
      srOrder.current_status ??
      ""
    ).toString().toUpperCase().trim();

    console.log("[Sync] Shiprocket raw status:", rawStatus);

    const mappedStatus = SR_TO_STATUS[rawStatus];

    if (!mappedStatus) {
      return ok({
        synced:      false,
        raw_status:  rawStatus,
        message:     `Unknown Shiprocket status: "${rawStatus}" — no change made`,
      });
    }

    if (mappedStatus === order.status) {
      return ok({
        synced:      false,
        raw_status:  rawStatus,
        mapped:      mappedStatus,
        message:     "Status already up to date",
      });
    }

    // Update order status
    await admin.from("orders").update({ status: mappedStatus }).eq("id", id);

    // Restore stock if cancelled
    if (mappedStatus === "cancelled") {
      await restoreStock(admin, id);
    }

    console.log(`[Sync] Order ${id}: ${order.status} → ${mappedStatus}`);

    return ok({
      synced:     true,
      old_status: order.status,
      new_status: mappedStatus,
      raw_status: rawStatus,
    });
  } catch (e) {
    return serverError(e);
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
        const { data: v } = await admin
          .from("product_variants").select("stock").eq("id", item.variant_id).single();
        if (v) {
          await admin.from("product_variants")
            .update({ stock: v.stock + item.quantity })
            .eq("id", item.variant_id);
        }
        const { data: all } = await admin
          .from("product_variants").select("stock").eq("product_id", item.product_id);
        if (all) {
          await admin.from("products")
            .update({ stock: all.reduce((s: number, x: any) => s + x.stock, 0) })
            .eq("id", item.product_id);
        }
      } else {
        const { data: p } = await admin
          .from("products").select("stock").eq("id", item.product_id).single();
        if (p) {
          await admin.from("products")
            .update({ stock: p.stock + item.quantity })
            .eq("id", item.product_id);
        }
      }
    }
  } catch (e) {
    console.error("[Sync] Stock restore failed:", e);
  }
}