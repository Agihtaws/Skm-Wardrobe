import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductDetail from "@/components/product/ProductDetail";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name, description, images, sell_price, regular_price")
    .eq("slug", slug)
    .single();

  if (!data) return {};
  return {
    title: data.name,
    description: data.description ?? `Buy ${data.name} at SKM Wardrobe`,
    openGraph: {
      images: data.images?.[0] ? [{ url: data.images[0] }] : [],
    },
  };
}

export const revalidate = 60;

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
  .from("products")
  .select(`
    *,
    category:categories(id, name, slug, gender, parent_id),
    product_attributes(
      id, attribute_id, attribute_value_id,
      attribute:attributes(id, name),
      attribute_value:attribute_values(id, value)
    ),
    variants:product_variants(*)
  `)
  .eq("slug", slug)
  .eq("is_active", true)
  .single();

  if (!product) notFound();

  // Get attribute value IDs for this product
  const attrValueIds =
    product.product_attributes?.map((pa: any) => pa.attribute_value_id) ?? [];

  // Related: same category, in stock, not this product
  const { data: sameCat } = await supabase
    .from("products")
    .select("*, category:categories(id,name,slug,gender)")
    .eq("category_id", product.category_id)
    .eq("is_active", true)
    .gt("stock", 0)
    .neq("id", product.id)
    .limit(8);

  // Also get products sharing attributes (if not enough from category)
  let related = sameCat ?? [];

  if (related.length < 4 && attrValueIds.length > 0) {
    const { data: attrRows } = await supabase
      .from("product_attributes")
      .select("product_id")
      .in("attribute_value_id", attrValueIds)
      .neq("product_id", product.id);

    const attrProductIds = [
      ...new Set(attrRows?.map((r) => r.product_id) ?? []),
    ].filter((id) => !related.find((p) => p.id === id));

    if (attrProductIds.length > 0) {
      const { data: attrProducts } = await supabase
        .from("products")
        .select("*, category:categories(id,name,slug,gender)")
        .in("id", attrProductIds)
        .eq("is_active", true)
        .gt("stock", 0)
        .limit(4 - related.length);

      related = [...related, ...(attrProducts ?? [])];
    }
  }

  return (
    <ProductDetail
      product={product as any}
      related={related.slice(0, 4) as any}
    />
  );
}