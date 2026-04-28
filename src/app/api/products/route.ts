import { createClient } from "@/lib/supabase/server";
import { ok, err, serverError } from "@/lib/api-response";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    const categoryId = searchParams.get("category");
    const gender     = searchParams.get("gender");
    const search     = searchParams.get("search");
    const colorId    = searchParams.get("color");
    const fabricId   = searchParams.get("fabric");
    const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit      = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
    const offset     = (page - 1) * limit;
    const sort       = searchParams.get("sort") ?? "created_at";
    const dir        = searchParams.get("dir") !== "asc";

    // Step 1 — resolve category IDs for gender filter
    let categoryIds: string[] | null = null;

    if (categoryId) {
      categoryIds = [categoryId];
    } else if (gender) {
      const { data: cats } = await supabase
        .from("categories")
        .select("id")
        .eq("gender", gender)
        .eq("is_active", true);
      categoryIds = cats?.map((c) => c.id) ?? [];
      if (categoryIds.length === 0) {
        return ok({ products: [], pagination: { page, limit, total: 0, pages: 0 } });
      }
    }

    // Step 2 — attribute filters
    let attrFilteredIds: string[] | null = null;
    const attrFilters = [colorId, fabricId].filter(Boolean) as string[];

    if (attrFilters.length > 0) {
      for (const valueId of attrFilters) {
        const { data: rows } = await supabase
          .from("product_attributes")
          .select("product_id")
          .eq("attribute_value_id", valueId);
        const ids = rows?.map((r) => r.product_id) ?? [];
        attrFilteredIds = attrFilteredIds === null
          ? ids
          : attrFilteredIds.filter((id) => ids.includes(id));
      }
      if (attrFilteredIds?.length === 0) {
        return ok({ products: [], pagination: { page, limit, total: 0, pages: 0 } });
      }
    }

    // Step 3 — main query
    let query = supabase
      .from("products")
      .select("*, category:categories(id, name, slug, gender, parent_id)", { count: "exact" })
      .eq("is_active", true)
      .gt("stock", 0)
      .order(sort, { ascending: !dir })
      .range(offset, offset + limit - 1);

    if (categoryIds !== null)       query = query.in("category_id", categoryIds);
    if (search)                     query = query.ilike("name", `%${search}%`);
    if (attrFilteredIds !== null)   query = query.in("id", attrFilteredIds);

    const { data, error, count } = await query;
    if (error) return err(error.message);

    return ok({
      products: data ?? [],
      pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
    });
  } catch (e) {
    return serverError(e);
  }
}