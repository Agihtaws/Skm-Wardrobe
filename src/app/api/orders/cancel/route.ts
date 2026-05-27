import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, unauthorized, serverError } from "@/lib/api-response";
import { sendEmail, emailOrderCancelled } from "@/lib/email";

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
      .select("*, items:order_items(product_id, variant_id, quantity)")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single();

    if (!order) return err("Order not found", 404);

    if (!["pending", "paid", "processing"].includes(order.status)) {
      return err("This order cannot be cancelled — it has already been shipped");
    }

    // ── Restore stock (variant-aware) ──────────────────────────────────
    for (const item of order.items ?? []) {
      if (item.variant_id) {
        const { data: variant } = await admin
          .from("product_variants").select("stock").eq("id", item.variant_id).single();
        if (variant) {
          await admin.from("product_variants")
            .update({ stock: variant.stock + item.quantity })
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
        const { data: product } = await admin
          .from("products").select("stock").eq("id", item.product_id).single();
        if (product) {
          await admin.from("products")
            .update({ stock: product.stock + item.quantity })
            .eq("id", item.product_id);
        }
      }
    }

    await admin.from("orders").update({ status: "cancelled" }).eq("id", order_id);

    // ── Send cancellation email ────────────────────────────────────────
    if (user.email) {
      const refundNote = order.payment_method === "online" && order.status === "paid"
        ? "Since you paid online, your refund will be processed within 5–7 business days."
        : undefined;

      await sendEmail(
        user.email,
        "Order cancelled — SKM Wardrobe",
        emailOrderCancelled(order_id, user.user_metadata?.full_name ?? "there", refundNote)
      );
    }

    return ok({ cancelled: true });
  } catch (e) {
    return serverError(e);
  }
}