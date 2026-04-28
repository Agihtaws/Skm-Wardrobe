"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown, ChevronRight, CheckCircle } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import SortSelect from "@/components/listing/SortSelect";
import Pagination from "@/components/ui/Pagination";
import type { Product, Category, Gender } from "@/types/database";
import { cn } from "@/lib/utils";

interface FilterData {
  colors:     { id: string; value: string }[];
  fabrics:    { id: string; value: string }[];
  categories: Category[];
}

interface Props {
  gender:       Gender;
  categoryId?:  string;
  title:        string;
  searchParams: { [key: string]: string | undefined };
}

const LIMIT = 20;

export default function ProductListingPage({
  gender,
  categoryId: serverCategoryId,
  title,
  searchParams: serverSP,
}: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();

  const [products,   setProducts]   = useState<Product[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [filterData, setFilterData] = useState<FilterData>({ colors: [], fabrics: [], categories: [] });
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(
    new Set(["categories", "color", "fabric"])
  );

  const page         = parseInt(sp.get("page") ?? "1");
  const sort         = sp.get("sort") ?? "created_at";
  const dir          = sp.get("dir") ?? "desc";
  const catFilter    = sp.get("category") ?? serverCategoryId ?? "";
  const colorFilter  = sp.get("color") ?? "";
  const fabricFilter = sp.get("fabric") ?? "";

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const toggleParam = (key: string, value: string) => {
    const current = sp.get(key);
    updateParam(key, current === value ? null : value);
  };

  const clearAll = () => {
    const params = new URLSearchParams();
    params.set("sort", sort);
    params.set("dir", dir);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // ── FIX 3: toggleSection is a plain state setter, not inside a sub-component ──
  const toggleSection = (key: string) =>
    setExpandedFilters((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const hasFilters = !!(catFilter || colorFilter || fabricFilter);

  // Fetch filter options
  useEffect(() => {
    const params = new URLSearchParams({ gender });
    if (catFilter) params.set("category", catFilter);
    fetch(`/api/products/filters?${params}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setFilterData(j.data); });
  }, [gender, catFilter]);

  // ── FIX 2: always send gender to the products API ──
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      gender,           // always included
      page:  String(page),
      limit: String(LIMIT),
      sort,
      dir,
    });
    if (catFilter)    params.set("category", catFilter);
    if (colorFilter)  params.set("color", colorFilter);
    if (fabricFilter) params.set("fabric", fabricFilter);

    const res  = await fetch(`/api/products?${params}`);
    const json = await res.json();
    if (json.success) {
      setProducts(json.data.products);
      setTotal(json.data.pagination.total);
    }
    setLoading(false);
  }, [page, sort, dir, catFilter, colorFilter, fabricFilter, gender]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Build category tree
  const rootCats  = filterData.categories.filter((c) => c.gender === gender && !c.parent_id);
  const getSubCats = (parentId: string) =>
    filterData.categories.filter((c) => c.parent_id === parentId);

  const totalPages = Math.ceil(total / LIMIT);

  // ── FIX 3: filter panel is inline JSX, NOT a nested component ──
  const filterPanel = (
    <div className="space-y-5">
      {/* Title */}
      <div className="pb-3 mb-4 border-b border-gray-100">
        <p className="font-bold text-pink-600 text-sm uppercase tracking-wider flex items-center gap-2">
          <SlidersHorizontal size={14} />
          Filters
        </p>
      </div>

      {/* Active filters */}
      {hasFilters && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Active Filters
            </p>
            <button
              onClick={clearAll}
              className="text-xs text-pink-600 hover:underline font-medium"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {catFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-100 text-pink-700 text-xs rounded-full">
                {filterData.categories.find((c) => c.id === catFilter)?.name ?? "Category"}
                <button onClick={() => updateParam("category", null)}>
                  <X size={11} />
                </button>
              </span>
            )}
            {colorFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-100 text-pink-700 text-xs rounded-full">
                {filterData.colors.find((c) => c.id === colorFilter)?.value ?? "Color"}
                <button onClick={() => updateParam("color", null)}>
                  <X size={11} />
                </button>
              </span>
            )}
            {fabricFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-100 text-pink-700 text-xs rounded-full">
                {filterData.fabrics.find((f) => f.id === fabricFilter)?.value ?? "Fabric"}
                <button onClick={() => updateParam("fabric", null)}>
                  <X size={11} />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Categories */}
      {rootCats.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection("categories")}
            className="flex items-center justify-between w-full mb-2"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Categories
            </p>
            {expandedFilters.has("categories")
              ? <ChevronDown size={14} className="text-gray-400" />
              : <ChevronRight size={14} className="text-gray-400" />}
          </button>

          {expandedFilters.has("categories") && (
            <ul className="space-y-0.5">
              {rootCats.map((cat) => {
                const subCats    = getSubCats(cat.id);
                const isSelected = catFilter === cat.id;
                const subSelected = subCats.some((s) => s.id === catFilter);
                const isExpanded = isSelected || subSelected;

                return (
                  <li key={cat.id}>
                    <div className="flex items-center">
                      {/* Category name → sets filter */}
                      <button
                        onClick={() => updateParam("category", isSelected ? null : cat.id)}
                        className={cn(
                          "flex-1 text-left px-3 py-2 rounded-lg text-sm transition-all border-l-2",
                          isSelected || subSelected
                            ? "border-pink-500 bg-pink-50 text-pink-700 font-semibold"
                            : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-200"
                        )}
                      >
                        {cat.name}
                      </button>

                      {/* ── FIX 1: chevron ONLY toggles expand, never changes URL ── */}
                      {subCats.length > 0 && (
                        <button
                          onClick={() => toggleSection(`cat-${cat.id}`)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <ChevronRight
                            size={13}
                            className={cn(
                              "transition-transform",
                              (isExpanded || expandedFilters.has(`cat-${cat.id}`))
                                ? "rotate-90"
                                : ""
                            )}
                          />
                        </button>
                      )}
                    </div>

                    {/* Subcategories */}
                    {(isExpanded || expandedFilters.has(`cat-${cat.id}`)) &&
                      subCats.length > 0 && (
                        <ul className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-pink-100 pl-2">
                          {subCats.map((sub) => (
                            <li key={sub.id}>
                              <button
                                onClick={() =>
                                  updateParam("category", sub.id === catFilter ? null : sub.id)
                                }
                                className={cn(
                                  "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all border-l-2",
                                  catFilter === sub.id
                                    ? "border-pink-400 bg-pink-50 text-pink-700 font-medium"
                                    : "border-transparent text-gray-500 hover:bg-gray-50"
                                )}
                              >
                                {sub.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Color */}
      {filterData.colors.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection("color")}
            className="flex items-center justify-between w-full mb-2"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Color</p>
            {expandedFilters.has("color")
              ? <ChevronDown size={14} className="text-gray-400" />
              : <ChevronRight size={14} className="text-gray-400" />}
          </button>

          {expandedFilters.has("color") && (
            <ul className="space-y-0.5">
              {filterData.colors.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => toggleParam("color", c.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-sm transition-all flex items-center gap-2.5 border",
                      colorFilter === c.id
                        ? "border-pink-400 bg-pink-50 text-pink-700 font-semibold shadow-sm"
                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-200"
                    )}
                  >
                    <span
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm flex-shrink-0 ring-1 ring-gray-200"
                      style={{ backgroundColor: c.value.toLowerCase().replace(/\s+/g, "") }}
                    />
                    {c.value}
                    {colorFilter === c.id && (
                      <CheckCircle size={13} className="ml-auto text-pink-500" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Fabric */}
      {filterData.fabrics.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection("fabric")}
            className="flex items-center justify-between w-full mb-2"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fabric</p>
            {expandedFilters.has("fabric")
              ? <ChevronDown size={14} className="text-gray-400" />
              : <ChevronRight size={14} className="text-gray-400" />}
          </button>

          {expandedFilters.has("fabric") && (
            <div className="flex flex-wrap gap-2">
              {filterData.fabrics.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleParam("fabric", f.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    fabricFilter === f.id
                      ? "bg-pink-600 text-white border-pink-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-pink-300 hover:text-pink-600"
                  )}
                >
                  {f.value}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
          {!loading && (
            <p className="text-sm text-gray-400 mt-0.5">
              {total} product{total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <SortSelect
            value={`${sort}-${dir}`}
            onChange={(val) => {
              const [s, d] = val.split("-");
              const params = new URLSearchParams(sp.toString());
              params.set("sort", s);
              params.set("dir", d);
              params.delete("page");
              router.push(`${pathname}?${params.toString()}`, { scroll: false });
            }}
          />
          <button
            onClick={() => setFilterOpen(true)}
            className={cn(
              "md:hidden flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors",
              hasFilters
                ? "border-pink-300 bg-pink-50 text-pink-700"
                : "border-gray-200 text-gray-700"
            )}
          >
            <SlidersHorizontal size={16} />
            Filter
            {hasFilters && (
              <span className="bg-pink-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {[catFilter, colorFilter, fabricFilter].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-6 lg:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-52 lg:w-56 flex-shrink-0">
          <div className="sticky top-24">
            {filterPanel}
          </div>
        </aside>

        {/* Mobile filter drawer */}
        {filterOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setFilterOpen(false)}
            />
            <div className="relative ml-auto w-72 h-full bg-white overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <p className="font-semibold text-gray-900">Filters</p>
                <button onClick={() => setFilterOpen(false)}>
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                {filterPanel}
              </div>
              {hasFilters && (
                <div className="sticky bottom-0 p-4 bg-white border-t border-gray-100">
                  <button
                    onClick={() => { clearAll(); setFilterOpen(false); }}
                    className="w-full py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🛍️</p>
              <p className="text-gray-600 font-medium text-lg">No products found</p>
              <p className="text-sm text-gray-400 mt-2">
                {hasFilters ? "Try removing some filters" : "Check back soon"}
              </p>
              {hasFilters && (
                <button
                  onClick={clearAll}
                  className="mt-4 px-5 py-2 bg-pink-600 text-white text-sm font-medium rounded-full hover:bg-pink-700 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} priority={i < 4} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-10">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={(p) => updateParam("page", String(p))}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}