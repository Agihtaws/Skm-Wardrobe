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

    // Step 1 — fetch order + items with product weight
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select(`*, items:order_items(*, product:products(weight_kg))`)
      .eq("id", id)
      .single();

    if (orderErr) return serverError(orderErr);
    if (!order)   return notFound("Order");

    // Step 2 — fetch address separately
    const { data: address } = order.address_id
      ? await admin.from("addresses").select("*").eq("id", order.address_id).single()
      : { data: null };

    console.log("[Ship] address_id:", order.address_id);
    console.log("[Ship] address:", JSON.stringify(address));

    if (!address?.pincode)
      return err("Order has no delivery address");

    // Step 3 — check if order can be shipped
    const canShip =
      ["paid", "processing"].includes(order.status) ||
      (order.status === "pending" && order.payment_method === "cod");

    if (!canShip)
      return err(`Cannot ship order with status "${order.status}". Must be paid, processing, or pending COD.`);

    // Step 4 — calculate total weight from items
    const totalWeight = Math.max(
      0.1,  // minimum 0.1 Kg
      (order.items ?? []).reduce((sum: number, item: any) => {
        const w = Number(item.product?.weight_kg ?? 0.3);
        return sum + (w * item.quantity);
      }, 0)
    );
    console.log("[Ship] Total weight (kg):", totalWeight);

    // Step 5 — unique order_id per attempt
    const srOrderId = `${order.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    console.log("[Ship] Sending to Shiprocket:", JSON.stringify({
      order_id:       srOrderId,
      customer_name:  address.full_name?.trim(),
      city:           address.city?.trim(),
      pincode:        address.pincode?.trim(),
      weight:         totalWeight,
      items_count:    (order.items ?? []).length,
    }));

    const srRes = await createShiprocketOrder({
      order_id:       srOrderId,
      order_date:     new Date(order.created_at).toISOString().split("T")[0],
      customer_name:  address.full_name?.trim()  ?? "Customer",
      customer_phone: address.phone?.trim()       ?? "",
      address:        `${address.line1?.trim()}${address.line2 ? ", " + address.line2.trim() : ""}`,
      city:           address.city?.trim()        ?? "",
      state:          address.state?.trim()       ?? "",
      pincode:        address.pincode?.trim()     ?? "",
      total:          Number(order.total),
      weight:         totalWeight,                // ✅ dynamic weight
      payment_method: order.payment_method === "cod" ? "cod" : "prepaid",
      items:          (order.items ?? []).map((item: any) => ({
        name:  item.product_name,
        qty:   item.quantity,
        price: Number(item.price_at_time),
        sku:   item.product_id?.slice(0, 8) ?? "SKU001",
      })),
    });

    console.log("[Shiprocket] Response:", JSON.stringify(srRes));

    if (srRes.status_code && srRes.status_code !== 1) {
      return err(`Shiprocket error: ${srRes.message ?? JSON.stringify(srRes)}`);
    }

    await admin
      .from("orders")
      .update({
        status:                 "processing",
        shiprocket_order_id:    String(srRes.order_id    ?? ""),
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