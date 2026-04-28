import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/admin/ProductForm";
import type { Metadata } from "next";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("name").eq("id", id).single();
  return { title: `Edit: ${data?.name ?? "Product"}` };
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }, { data: attributes }] = await Promise.all([
    supabase.from("products")
      .select("*, product_attributes(id, attribute_id, attribute_value_id, attribute:attributes(id,name), attribute_value:attribute_values(id,value))")
      .eq("id", id).single(),
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("attributes").select("*, values:attribute_values(*)").order("name"),
  ]);

  if (!product) notFound();

  return (
    <ProductForm
      product={product as any}
      categories={categories ?? []}
      attributes={attributes ?? []}
    />
  );
}