import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/ui/ProductCard";
import type { Metadata } from "next";

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Search results for "${q}"` : "Search" };
}

async function SearchResults({ query, page }: { query: string; page: number }) {
  if (!query) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p>Type something to search</p>
      </div>
    );
  }

  const supabase = await createClient();
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data: products, count } = await supabase
    .from("products")
    .select("*, category:categories(id,name,slug,gender)", { count: "exact" })
    .eq("is_active", true)
    .ilike("name", `%${query}%`)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!products?.length) {
    return (
      <div className="text-center py-24">
        <p className="text-4xl mb-3">😕</p>
        <p className="text-gray-600 font-medium">No results for &quot;{query}&quot;</p>
        <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-gray-500 mb-4">{count} results for &quot;{query}&quot;</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p as any} priority={i < 4} />
        ))}
      </div>
    </>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page = "1" } = await searchParams;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {q ? `Results for "${q}"` : "Search"}
      </h1>
      <Suspense fallback={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      }>
        <SearchResults query={q} page={parseInt(page)} />
      </Suspense>
    </div>
  );
}