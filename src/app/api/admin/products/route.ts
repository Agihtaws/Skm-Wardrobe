import { requireAdmin } from "@/lib/admin-guard";
import { ok, err, serverError } from "@/lib/api-response";
import { slugify } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { product_attributes, variants, ...productData } = body;

    // If variants exist, total stock = sum of all variant stocks
    if (variants?.length > 0) {
      productData.stock = variants.reduce(
        (s: number, v: any) => s + (parseInt(v.stock) || 0), 0
      );
    }

    // Ensure unique slug
    const baseSlug = productData.slug || slugify(productData.name);
    let slug    = baseSlug;
    let attempt = 0;
    while (true) {
      const { data } = await supabase!.from("products").select("id").eq("slug", slug).single();
      if (!data) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const { data: product, error: insertErr } = await supabase!
      .from("products")
      .insert({ ...productData, slug })
      .select()
      .single();

    if (insertErr) return err(insertErr.message);

    // Insert attributes
    if (product_attributes?.length) {
      const { error: attrErr } = await supabase!.from("product_attributes").insert(
        product_attributes.map((a: any) => ({
          product_id:         product.id,
          attribute_id:       a.attrId,
          attribute_value_id: a.valueId,
        }))
      );
      if (attrErr) console.error("Attr insert error:", attrErr.message);
    }

    // Insert variants
    if (variants?.length) {
      const { error: varErr } = await supabase!.from("product_variants").insert(
        variants.map((v: any, i: number) => ({
          product_id: product.id,
          size:       v.size,
          stock:      parseInt(v.stock) || 0,
          sort_order: i,
        }))
      );
      if (varErr) console.error("Variant insert error:", varErr.message);
    }

    return ok(product, 201);
  } catch (e) {
    return serverError(e);
  }
}