import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, unauthorized, serverError } from "@/lib/api-response";
import { sendEmail, emailOrderPlaced, emailPaymentConfirmed } from "@/lib/email";
import Razorpay from "razorpay";

const GST_RATE          = 0.05;
const SHIPPING_PER_ITEM = 40;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { address_id, payment_method } = await request.json();
    if (!address_id)     return err("Address is required");
    if (!payment_method) return err("Payment method is required");

    // ── Fetch cart ─────────────────────────────────────────────────────
    const { data: cartItems } = await supabase
      .from("cart")
      .select("*, product:products(id, name, sell_price, price, stock, images, is_active, weight_kg)")
      .eq("user_id", user.id);

    if (!cartItems?.length) return err("Cart is empty");

    for (const item of cartItems) {
      if (!item.product?.is_active) return err(`"${item.product?.name}" is no longer available`);
      if (item.product.stock < 1)   return err(`"${item.product?.name}" is out of stock`);
    }

    // ── Totals ─────────────────────────────────────────────────────────
    const subtotal = cartItems.reduce(
      (sum, item) => sum + (item.product.sell_price ?? item.product.price) * item.quantity, 0
    );
    const gst      = Math.round(subtotal * GST_RATE);
    const shipping = cartItems.length * SHIPPING_PER_ITEM;
    const total    = subtotal + gst + shipping;

    const admin         = createAdminClient();
    const customerName  = user.user_metadata?.full_name ?? "there";
    const emailItems    = cartItems.map((item) => ({
      name:  item.product.name,
      qty:   item.quantity,
      price: item.product.sell_price ?? item.product.price,
      size:  item.size ?? null,
    }));

    // ── COD flow ───────────────────────────────────────────────────────
    if (payment_method === "cod") {
      const { data: order, error: orderErr } = await admin
        .from("orders")
        .insert({
          user_id:        user.id,
          address_id,
          status:         "pending",
          payment_method: "cod",
          subtotal,
          gst_amount:     gst,
          shipping,
          total,
        })
        .select()
        .single();

      if (orderErr) return err(orderErr.message);

      // Insert order items
      await admin.from("order_items").insert(
        cartItems.map((item) => ({
          order_id:      order.id,
          product_id:    item.product_id,
          variant_id:    item.variant_id ?? null,
          size:          item.size ?? null,
          product_name:  item.product.name,
          product_image: item.product.images?.[0] ?? null,
          price_at_time: item.product.sell_price ?? item.product.price,
          quantity:      item.quantity,
        }))
      );

      // Decrement stock (variant-aware)
      for (const item of cartItems) {
        if (item.variant_id) {
          const { data: variant } = await admin
            .from("product_variants").select("stock").eq("id", item.variant_id).single();
          if (variant) {
            await admin.from("product_variants")
              .update({ stock: Math.max(0, variant.stock - item.quantity) })
              .eq("id", item.variant_id);
          }
          // Sync parent product stock
          const { data: allVariants } = await admin
            .from("product_variants").select("stock").eq("product_id", item.product_id);
          if (allVariants) {
            await admin.from("products")
              .update({ stock: allVariants.reduce((s, v) => s + v.stock, 0) })
              .eq("id", item.product_id);
          }
        } else {
          await admin.from("products")
            .update({ stock: Math.max(0, item.product.stock - item.quantity) })
            .eq("id", item.product_id);
        }
      }

      // Clear cart
      await admin.from("cart").delete().eq("user_id", user.id);

      // Send email
      if (user.email) {
        await sendEmail(
          user.email,
          "Order confirmed — SKM Wardrobe",
          emailOrderPlaced({ orderId: order.id, customerName, items: emailItems, total, paymentMethod: "cod" })
        );
      }

      return ok({ order_id: order.id, payment_method: "cod" });
    }

    // ── Online (Razorpay) flow ─────────────────────────────────────────
    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const rzpOrder = await razorpay.orders.create({
      amount:   total * 100,
      currency: "INR",
      notes:    { user_id: user.id, address_id },
    });

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        user_id:           user.id,
        address_id,
        status:            "pending",
        payment_method:    "online",
        subtotal,
        gst_amount:        gst,
        shipping,
        total,
        razorpay_order_id: rzpOrder.id,
      })
      .select()
      .single();

    if (orderErr) return err(orderErr.message);

    await admin.from("order_items").insert(
      cartItems.map((item) => ({
        order_id:      order.id,
        product_id:    item.product_id,
        variant_id:    item.variant_id ?? null,
        size:          item.size ?? null,
        product_name:  item.product.name,
        product_image: item.product.images?.[0] ?? null,
        price_at_time: item.product.sell_price ?? item.product.price,
        quantity:      item.quantity,
      }))
    );

    // Note: stock decremented in verify route after payment confirmed

    return ok({
      order_id:          order.id,
      razorpay_order_id: rzpOrder.id,
      amount:            total * 100,
      currency:          "INR",
      key:               process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (e) {
    return serverError(e);
  }
}