import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductListingPage from "@/components/listing/ProductListingPage";
import type { Metadata } from "next";
import type { Gender } from "@/types/database";

const GENDER_META: Record<string, { title: string; description: string }> = {
  women:       { title: "Women's Ethnic Wear",  description: "Sarees, kurtis, chudidars and more." },
  kids:        { title: "Kids Wear",             description: "Boys and girls ethnic wear." },
  accessories: { title: "Accessories",           description: "Umbrellas, purses and handbags." },
};

interface Props {
  params:       Promise<{ gender: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gender } = await params;
  const meta = GENDER_META[gender];
  if (!meta) return {};
  return { title: meta.title, description: meta.description };
}

export default async function GenderPage({ params, searchParams }: Props) {
  const { gender } = await params;
  const sp         = await searchParams;
  if (!GENDER_META[gender]) notFound();

  const supabase = await createClient();

  // Fetch all category IDs for this gender
  const { data: cats } = await supabase
    .from("categories")
    .select("id")
    .eq("gender", gender)
    .eq("is_active", true);

  const categoryIds = cats?.map((c) => c.id) ?? [];

  // Fetch initial products on server
  const { data: initialProducts, count } = categoryIds.length > 0
    ? await supabase
        .from("products")
        .select("*, category:categories(id,name,slug,gender)", { count: "exact" })
        .eq("is_active", true)
        .in("category_id", categoryIds)
        .order("created_at", { ascending: false })
        .range(0, 19)
    : { data: [], count: 0 };

  return (
    <ProductListingPage
      gender={gender as Gender}
      title={GENDER_META[gender].title}
      searchParams={{ ...sp, gender }}
      initialProducts={initialProducts ?? []}
      initialTotal={count ?? 0}
    />
  );
}