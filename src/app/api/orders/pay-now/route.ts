import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, unauthorized, serverError } from "@/lib/api-response";
import Razorpay from "razorpay";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { order_id } = await request.json();
    if (!order_id) return err("order_id required");

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single();

    if (!order)                  return err("Order not found", 404);
    if (order.payment_method !== "cod") return err("This order is already paid online");
    if (!["pending", "processing"].includes(order.status))
      return err("Cannot pay for this order anymore");

    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const rzpOrder = await razorpay.orders.create({
      amount:   Number(order.total) * 100,
      currency: "INR",
      notes:    { order_id, user_id: user.id },
    });

    // Update order with razorpay order id
    await admin
      .from("orders")
      .update({ razorpay_order_id: rzpOrder.id, payment_method: "online" })
      .eq("id", order_id);

    return ok({
      order_id,
      razorpay_order_id: rzpOrder.id,
      amount:            Number(order.total) * 100,
      currency:          "INR",
      key:               process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (e) {
    return serverError(e);
  }
}