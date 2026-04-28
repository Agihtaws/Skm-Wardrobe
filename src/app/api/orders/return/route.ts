import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, unauthorized, serverError } from "@/lib/api-response";
import { createReturn } from "@/lib/shiprocket";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { order_id, reason } = await request.json();
    if (!order_id || !reason?.trim()) return err("order_id and reason required");

    const admin = createAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select("*, address:addresses(*), items:order_items(*)")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single();

    if (!order)                     return err("Order not found", 404);
    if (order.status !== "delivered") return err("Only delivered orders can be returned");
    if (order.return_requested)       return err("Return already requested");

    // Check 3-day window
    const deliveredAt = new Date(order.updated_at);
    const daysSince   = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 3) return err("3-day return window has expired");

    // Save return request
    const { data: returnReq } = await admin
      .from("return_requests")
      .insert({
        order_id,
        user_id:       user.id,
        reason:        reason.trim(),
        status:        "requested",
        refund_amount: Number(order.total),
      })
      .select()
      .single();

    // Mark order
    await admin.from("orders").update({
      return_requested: true,
      return_reason:    reason.trim(),
      return_status:    "requested",
    }).eq("id", order_id);

    // Create Shiprocket return shipment if AWB exists
    if (order.shiprocket_order_id) {
      try {
        await createReturn({
          order_id:         String(order.shiprocket_order_id),
          channel_order_id: order.id.slice(0, 8).toUpperCase(),
          customer_name:    order.address?.full_name ?? "Customer",
          customer_phone:   order.address?.phone ?? "",
          address:          `${order.address?.line1}${order.address?.line2 ? ", " + order.address.line2 : ""}`,
          city:             order.address?.city ?? "",
          state:            order.address?.state ?? "",
          pincode:          order.address?.pincode ?? "",
          items:            order.items?.map((i: any) => ({
            name:  i.product_name,
            sku:   i.product_id?.slice(0, 8) ?? "SKU",
            qty:   i.quantity,
            price: Number(i.price_at_time),
          })) ?? [],
        });
      } catch (srErr) {
        console.error("Shiprocket return creation failed:", srErr);
        // Don't fail the request — admin can create manually
      }
    }

    return ok({ return_id: returnReq?.id, message: "Return requested successfully" });
  } catch (e) {
    return serverError(e);
  }
}