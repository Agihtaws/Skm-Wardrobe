import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, serverError } from "@/lib/api-response";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id }     = await params;
    const { status } = await request.json();
    const admin      = createAdminClient();

    const { data: ret } = await admin
      .from("return_requests")
      .select("order_id, refund_amount")
      .eq("id", id)
      .single();

    if (!ret) return err("Not found", 404);

    await admin.from("return_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    // When refunded → update order status and restore stock
    if (status === "refunded") {
      await admin.from("orders")
        .update({ status: "refunded", return_status: "refunded" })
        .eq("id", ret.order_id);

      // Get order items and restore stock
      const { data: items } = await admin
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", ret.order_id);

      for (const item of items ?? []) {
        const { data: product } = await admin
          .from("products")
          .select("stock")
          .eq("id", item.product_id)
          .single();
        if (product) {
          await admin.from("products")
            .update({ stock: product.stock + item.quantity })
            .eq("id", item.product_id);
        }
      }
    }

    return ok({ updated: true });
  } catch (e) {
    return serverError(e);
  }
}