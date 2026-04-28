import { createClient } from "@/lib/supabase/server";
import { ok, serverError } from "@/lib/api-response";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;
    const gender     = searchParams.get("gender");
    const categoryId = searchParams.get("category");

    // Step 1 — get category IDs scoped to gender
    let scopedCategoryIds: string[] | null = null;

    if (categoryId) {
      scopedCategoryIds = [categoryId];
    } else if (gender) {
      const { data: cats } = await supabase
        .from("categories")
        .select("id")
        .eq("gender", gender)
        .eq("is_active", true);
      scopedCategoryIds = cats?.map((c) => c.id) ?? [];
    }

    // Step 2 — get product IDs in scope
    let productQuery = supabase
      .from("products")
      .select("id")
      .eq("is_active", true)
      .gt("stock", 0);

    if (scopedCategoryIds !== null) {
      if (scopedCategoryIds.length === 0) {
        return ok({ colors: [], fabrics: [], categories: [] });
      }
      productQuery = productQuery.in("category_id", scopedCategoryIds);
    }

    const { data: products } = await productQuery;
    const productIds = products?.map((p) => p.id) ?? [];

    if (!productIds.length) return ok({ colors: [], fabrics: [], categories: [] });

    // Step 3 — get attributes used by these products only
    const { data: usedAttrs } = await supabase
      .from("product_attributes")
      .select(`
        attribute_value_id,
        attribute_value:attribute_values(
          id, value,
          attribute:attributes(id, name)
        )
      `)
      .in("product_id", productIds);

    const seen = new Set<string>();
    const colors:  { id: string; value: string }[] = [];
    const fabrics: { id: string; value: string }[] = [];

    usedAttrs?.forEach((row: any) => {
      const av   = row.attribute_value;
      const name = av?.attribute?.name?.toLowerCase() ?? "";
      const key  = av?.id;
      if (!key || seen.has(key)) return;
      seen.add(key);
      if (name === "color")  colors.push({ id: av.id, value: av.value });
      if (name === "fabric") fabrics.push({ id: av.id, value: av.value });
    });

    // Step 4 — categories for sidebar (gender-scoped, root only)
    let catQuery = supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (gender) catQuery = catQuery.eq("gender", gender);

    const { data: categories } = await catQuery;

    return ok({
      colors:     colors.sort((a, b) => a.value.localeCompare(b.value)),
      fabrics:    fabrics.sort((a, b) => a.value.localeCompare(b.value)),
      categories: categories ?? [],
    });
  } catch (e) {
    return serverError(e);
  }
}