import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductsTable from "./ProductsTable";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Products" };
export const revalidate = 0;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; filter?: string }>;
}) {
  const { search, filter } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("*, category:categories(id,name,slug,gender)")
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("name", `%${search}%`);
  if (filter === "low_stock") query = query.lte("stock", 3);

  const { data: products } = await query;

  return (
    <div className="p-3 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products?.length ?? 0} products</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg"
        >
          + Add Product
        </Link>
      </div>
      <ProductsTable products={products ?? []} />
    </div>
  );
}