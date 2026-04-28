import { createClient } from "@/lib/supabase/server";
import { ok, err, unauthorized, serverError } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { product_id } = await request.json();
    if (!product_id) return err("product_id required");

    // Check product exists and has stock
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id, name, slug, sell_price, price, stock, images, is_active")
      .eq("id", product_id)
      .eq("is_active", true)
      .single();

    if (pErr || !product) return err("Product not found", 404);
    if (product.stock < 1)  return err("Out of stock", 400);

    const { data: cartItem, error: cErr } = await supabase
      .from("cart")
      .upsert(
        { user_id: user.id, product_id, quantity: 1 },
        { onConflict: "user_id,product_id" }
      )
      .select("*, product:products(id,name,slug,sell_price,price,stock,images)")
      .single();

    if (cErr) return err(cErr.message);
    return ok(cartItem, 201);
  } catch (e) {
    return serverError(e);
  }
}