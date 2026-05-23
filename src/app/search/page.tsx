import { createClient } from "@/lib/supabase/server";
import SearchClient from "./SearchClient";
import type { Metadata } from "next";

interface Props {
  searchParams: Promise<{ q?: string; page?: string; category?: string; sort?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Search results for "${q}"` : "Search" };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page = "1", category = "", sort = "created_at-desc" } = await searchParams;

  const supabase   = await createClient();
  const limit      = 20;
  const pageNum    = Math.max(1, parseInt(page));
  const offset     = (pageNum - 1) * limit;
  const [sortField, sortDir] = sort.split("-");

  // Fetch categories for the filter sidebar
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (!q.trim()) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="text-center py-24 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p>Type something to search</p>
        </div>
      </div>
    );
  }

  // Build product query
  let query = supabase
    .from("products")
    .select("*, category:categories(id,name,slug,gender)", { count: "exact" })
    .eq("is_active", true)
    .ilike("name", `%${q}%`)
    .order(sortField ?? "created_at", { ascending: sortDir === "asc" })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category_id", category);

  const { data: products, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / limit);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
        Results for &quot;{q}&quot;
      </h1>
      <SearchClient
        query={q}
        products={products ?? []}
        categories={categories ?? []}
        page={pageNum}
        totalPages={totalPages}
        total={count ?? 0}
        selectedCategory={category}
        sort={sort}
      />
    </div>
  );
}