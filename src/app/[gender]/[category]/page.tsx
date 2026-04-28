import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductListingPage from "@/components/listing/ProductListingPage";
import type { Metadata } from "next";
import type { Gender } from "@/types/database";

interface Props {
  params:      Promise<{ gender: string; category: string }>;
  searchParams:Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const supabase     = await createClient();
  const { data }     = await supabase
    .from("categories").select("name").eq("slug", category).single();
  return { title: data?.name ?? "Products" };
}

export const revalidate = 60;

export default async function CategoryPage({ params, searchParams }: Props) {
  const { gender, category } = await params;
  const sp                   = await searchParams;
  const supabase             = await createClient();

  const { data: cat } = await supabase
    .from("categories")
    .select("id, name, slug, gender")
    .eq("slug", category)
    .eq("is_active", true)
    .single();

  if (!cat) notFound();

  return (
    <ProductListingPage
      gender={gender as Gender}
      categoryId={cat.id}
      title={cat.name}
      searchParams={sp}
    />
  );
}