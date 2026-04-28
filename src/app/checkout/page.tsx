import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckoutClient from "./CheckoutClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/checkout");

  const [{ data: cartItems }, { data: addresses }] = await Promise.all([
    supabase
      .from("cart")
      .select("*, product:products(id,name,slug,sell_price,price,stock,images,is_active)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false }),
  ]);

  if (!cartItems?.length) redirect("/");

  return (
    <CheckoutClient
      initialCart={cartItems}
      initialAddresses={addresses ?? []}
    />
  );
}