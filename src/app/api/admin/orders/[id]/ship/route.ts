import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, notFound, serverError } from "@/lib/api-response";
import { createShiprocketOrder } from "@/lib/shiprocket";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id }  = await params;
    const admin   = createAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select(`
        *,
        address:addresses(*),
        items:order_items(*)
      `)
      .eq("id", id)
      .single();

    if (!order) return notFound("Order");
    if (!["paid", "processing"].includes(order.status))
      return err("Order must be paid or processing to ship");

    // Create Shiprocket order
    const srRes = await createShiprocketOrder({
      order_id:       order.id.slice(0, 8).toUpperCase(),
      order_date:     new Date(order.created_at).toISOString().split("T")[0],
      customer_name:  order.address?.full_name ?? "Customer",
      customer_phone: order.address?.phone ?? "",
      address:        `${order.address?.line1}${order.address?.line2 ? ", " + order.address.line2 : ""}`,
      city:           order.address?.city ?? "",
      state:          order.address?.state ?? "",
      pincode:        order.address?.pincode ?? "",
      total:          Number(order.total),
      payment_method: order.payment_method === "cod" ? "cod" : "prepaid",
      items:          order.items?.map((item: any) => ({
        name:  item.product_name,
        qty:   item.quantity,
        price: Number(item.price_at_time),
        sku:   item.product_id?.slice(0, 8) ?? "SKU001",
      })) ?? [],
    });

    if (srRes.status_code && srRes.status_code !== 1) {
      return err(`Shiprocket error: ${srRes.message ?? JSON.stringify(srRes)}`);
    }

    // Save Shiprocket IDs to order
    await admin.from("orders").update({
      status:                "processing",
      shiprocket_order_id:   String(srRes.order_id ?? ""),
      shiprocket_shipment_id: String(srRes.shipment_id ?? ""),
    }).eq("id", id);

    return ok({
      shiprocket_order_id:    srRes.order_id,
      shiprocket_shipment_id: srRes.shipment_id,
      message: "Shiprocket order created. Now assign courier.",
    });
  } catch (e) {
    return serverError(e);
  }
}