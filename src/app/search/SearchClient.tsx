"use client";

import { useRouter } from "next/navigation";
import SortSelect from "@/components/listing/SortSelect";
import Pagination from "@/components/ui/Pagination";
import ProductCard from "@/components/ui/ProductCard";

interface Props {
  query:      string;
  products:   any[];
  page:       number;
  totalPages: number;
  total:      number;
  sort:       string;
}

export default function SearchClient({
  query, products, page, totalPages, total, sort,
}: Props) {
  const router = useRouter();

  const updateURL = (updates: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("sort", sort);
    params.set("page", "1");
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else       params.delete(key);
    });
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div>
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
  );
}