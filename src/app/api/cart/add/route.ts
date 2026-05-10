import { createClient } from "@/lib/supabase/server";
import { ok, err, unauthorized, serverError } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { product_id, variant_id } = await request.json();
    if (!product_id) return err("product_id required");

    // Check product
    const { data: product } = await supabase
      .from("products")
      .select("id, name, sell_price, price, stock, images, is_active")
      .eq("id", product_id)
      .eq("is_active", true)
      .single();

    if (!product) return err("Product not found", 404);

    let size: string | null = null;

    // If variant provided, check variant stock
    if (variant_id) {
      const { data: variant } = await supabase
        .from("product_variants")
        .select("id, size, stock")
        .eq("id", variant_id)
        .eq("product_id", product_id)
        .single();

      if (!variant)        return err("Variant not found", 404);
      if (variant.stock < 1) return err("This size is out of stock", 400);
      size = variant.size;
    } else {
      // No variant — check if product has variants
      const { data: variants } = await supabase
        .from("product_variants")
        .select("id")
        .eq("product_id", product_id)
        .limit(1);

      if (variants && variants.length > 0)
        return err("Please select a size", 400);

      if (product.stock < 1)
        return err("Out of stock", 400);
    }

    // Upsert into cart
    const { data: cartItem, error: cErr } = await supabase
      .from("cart")
      .upsert(
        {
          user_id:    user.id,
          product_id,
          variant_id: variant_id ?? null,
          size:       size ?? null,
          quantity:   1,
        },
        { onConflict: "user_id,product_id,variant_id" }
      )
      .select(
        "*, product:products(id,name,slug,sell_price,price,regular_price,stock,images), variant:product_variants(id,size,stock)"
      )
      .single();

    if (cErr) return err(cErr.message);
    return ok(cartItem, 201);
  } catch (e) {
    return serverError(e);
  }
}