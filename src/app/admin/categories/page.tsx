import { createClient } from "@/lib/supabase/server";
import CategoriesClient from "./CategoriesClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Categories" };
export const revalidate = 0;

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("gender")
    .order("sort_order");

  return <CategoriesClient initialCategories={categories ?? []} />;
}