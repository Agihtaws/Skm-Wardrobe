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

    const { id } = await params;
    const admin  = createAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select(`*, address:addresses(*), items:order_items(*)`)
      .eq("id", id)
      .single();

    if (!order) return notFound("Order");

    // Allow: paid, processing, AND pending COD orders
    const canShip =
      ["paid", "processing"].includes(order.status) ||
      (order.status === "pending" && order.payment_method === "cod");

    if (!canShip)
      return err(
        `Cannot ship order with status "${order.status}". Must be paid, processing, or pending COD.`
      );

    if (!order.address)
      return err("Order has no delivery address");

    const srRes = await createShiprocketOrder({
      order_id:       order.id.slice(0, 8).toUpperCase(),
      order_date:     new Date(order.created_at).toISOString().split("T")[0],
      customer_name:  order.address.full_name ?? "Customer",
      customer_phone: order.address.phone ?? "",
      address:        `${order.address.line1}${order.address.line2 ? ", " + order.address.line2 : ""}`,
      city:           order.address.city ?? "",
      state:          order.address.state ?? "",
      pincode:        order.address.pincode ?? "",
      total:          Number(order.total),
      payment_method: order.payment_method === "cod" ? "cod" : "prepaid",
      items:          (order.items ?? []).map((item: any) => ({
        name:  item.product_name,
        qty:   item.quantity,
        price: Number(item.price_at_time),
        sku:   item.product_id?.slice(0, 8) ?? "SKU001",
      })),
    });

    console.log("[Shiprocket] Create order response:", JSON.stringify(srRes));

    // Shiprocket returns status 1 for success
    if (srRes.status_code && srRes.status_code !== 1) {
      return err(`Shiprocket error: ${srRes.message ?? JSON.stringify(srRes)}`);
    }

    // Update order with Shiprocket details
    await admin
      .from("orders")
      .update({
        status:                 "processing",
        shiprocket_order_id:    String(srRes.order_id ?? ""),
        shiprocket_shipment_id: String(srRes.shipment_id ?? ""),
      })
      .eq("id", id);

    return ok({
      shiprocket_order_id:    srRes.order_id,
      shiprocket_shipment_id: srRes.shipment_id,
      message:                "Shiprocket order created successfully",
    });
  } catch (e) {
    return serverError(e);
  }
}