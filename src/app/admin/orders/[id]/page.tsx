import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrderDetailClient from "./OrderDetailClient";
import type { Metadata } from "next";

interface Props { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: "Order Detail" };
export const revalidate = 0;

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(`
      *,
      address:addresses(*),
      items:order_items(*, product:products(id,name,slug,images))
    `)
    .eq("id", id)
    .single();

  if (!order) notFound();

  return <OrderDetailClient order={order as any} />;
}