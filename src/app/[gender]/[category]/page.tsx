import { Suspense } from "react";
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
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <ProductListingPage
        gender={gender as Gender}
        categoryId={cat.id}
        title={cat.name}
        searchParams={sp}
      />
    </Suspense>
  );
}