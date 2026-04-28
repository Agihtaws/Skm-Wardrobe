import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/admin/ProductForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add Product" };

export default async function NewProductPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: attributes }] = await Promise.all([
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("attributes").select("*, values:attribute_values(*)").order("name"),
  ]);
  return <ProductForm categories={categories ?? []} attributes={attributes ?? []} />;
}