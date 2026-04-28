import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrderDetailClient from "./OrderDetailClient";
import type { Metadata } from "next";

interface Props {
  params:      Promise<{ id: string }>;
  searchParams:Promise<{ status?: string }>;
}

export const metadata: Metadata = { title: "Order Details" };
export const revalidate = 0;

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { id }     = await params;
  const { status } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: order } = await supabase
    .from("orders")
    .select(`
      *,
      address:addresses(*),
      items:order_items(*, product:products(id,name,slug,images))
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!order) notFound();

  return <OrderDetailClient order={order as any} justPlaced={status === "placed" || status === "paid"} />;
}