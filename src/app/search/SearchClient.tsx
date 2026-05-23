"use client";

import { useRouter } from "next/navigation";
import FilterSidebar from "@/components/listing/FilterSidebar";
import SortSelect from "@/components/listing/SortSelect";
import Pagination from "@/components/ui/Pagination";
import ProductCard from "@/components/ui/ProductCard";
import type { Category } from "@/types/database";

interface Props {
  query:            string;
  products:         any[];
  categories:       Category[];
  page:             number;
  totalPages:       number;
  total:            number;
  selectedCategory: string;
  sort:             string;
}

export default function SearchClient({
  query, products, categories, page, totalPages, total, selectedCategory, sort,
}: Props) {
  const router = useRouter();

  // Build URL with updated params — always resets to page 1 on filter/sort change
  const updateURL = (updates: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set("q", query);
    if (selectedCategory) params.set("category", selectedCategory);
    if (sort)             params.set("sort", sort);
    params.set("page", "1");

    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else       params.delete(key);
    });

    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex gap-6">

      {/* ── Filter Sidebar (desktop only) ── */}
      <aside className="hidden md:block w-48 flex-shrink-0">
        <FilterSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={(id) => updateURL({ category: id, page: "1" })}
        />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">

        {/* Top bar: result count + sort */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <p className="text-sm text-gray-500">
            {total} result{total !== 1 ? "s" : ""} for &quot;{query}&quot;
          </p>
          <SortSelect
            value={sort}
            onChange={(v) => updateURL({ sort: v, page: "1" })}
          />
        </div>

        {/* Mobile category filter */}
        {categories.length > 0 && (
          <div className="md:hidden mb-4">
            <select
              value={selectedCategory}
              onChange={(e) => updateURL({ category: e.target.value, page: "1" })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500 w-full"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Products grid */}
        {products.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-4xl mb-3">😕</p>
            <p className="text-gray-600 font-medium">No results for &quot;{query}&quot;</p>
            <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p as any} priority={i < 4} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => updateURL({ page: String(p) })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}