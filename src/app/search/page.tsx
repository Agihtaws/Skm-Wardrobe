import { createClient } from "@/lib/supabase/server";
import SearchClient from "./SearchClient";
import type { Metadata } from "next";

interface Props {
  searchParams: Promise<{ q?: string; page?: string; sort?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Search results for "${q}"` : "Search" };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page = "1", sort = "created_at-desc" } = await searchParams;

  const supabase   = await createClient();
  const limit      = 20;
  const pageNum    = Math.max(1, parseInt(page));
  const offset     = (pageNum - 1) * limit;
  const [sortField, sortDir] = sort.split("-");

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

  const { data: products, count } = await supabase
    .from("products")
    .select("*, category:categories(id,name,slug,gender)", { count: "exact" })
    .eq("is_active", true)
    .ilike("name", `%${q}%`)
    .order(sortField ?? "created_at", { ascending: sortDir === "asc" })
    .range(offset, offset + limit - 1);

  const totalPages = Math.ceil((count ?? 0) / limit);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
        Results for &quot;{q}&quot;
      </h1>
      <SearchClient
        query={q}
        products={products ?? []}
        page={pageNum}
        totalPages={totalPages}
        total={count ?? 0}
        sort={sort}
      />
    </div>
  );
}