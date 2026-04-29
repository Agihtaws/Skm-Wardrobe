import { createClient } from "@/lib/supabase/server";
import HomeClient from "@/components/home/HomeClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SKM Wardrobe — Ethnic Wear for Women & Kids",
  description: "Shop sarees, kurtis, chudidars, kids wear and accessories.",
};

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();

  // Top-level categories with images (for carousel)
  const { data: topCategories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .is("parent_id", null)
    .order("sort_order");

  // For each top-level category, get latest 6 products
  const sectionsRaw = await Promise.all(
    (topCategories ?? []).map(async (cat) => {
      // Get all sub-category IDs
      const { data: subCats } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_id", cat.id);

      const allCatIds = [cat.id, ...(subCats?.map((s) => s.id) ?? [])];

      const { data: products } = await supabase
        .from("products")
        .select("*, category:categories(id,name,slug,gender)")
        .in("category_id", allCatIds)
        .eq("is_active", true)
        .gt("stock", 0)
        .order("created_at", { ascending: false })
        .limit(6);

      return { category: cat, products: products ?? [] };
    })
  );

  // Only sections that have products
  const sections = sectionsRaw.filter((s) => s.products.length > 0);

  // Carousel items — categories that have images
  const carouselItems = (topCategories ?? []).filter((c) => c.image_url);

  return (
    <HomeClient
      sections={sections}
      carouselItems={carouselItems}
    />
  );
}