import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CartPageClient from "./CartPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your Cart" };

export default async function CartPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cart");

  const { data: cartItems } = await supabase
    .from("cart")
    .select("*, product:products(id,name,slug,sell_price,price,regular_price,stock,images,is_active)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <CartPageClient initialCart={cartItems ?? []} />;
}