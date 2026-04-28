import { createClient } from "@/lib/supabase/server";
import ReturnsClient from "./ReturnsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Return Requests" };
export const revalidate = 0;

export default async function ReturnsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("return_requests")
    .select(`
      *,
      order:orders(
        id, total, shiprocket_order_id, shiprocket_awb,
        items:order_items(product_name, quantity, price_at_time),
        address:addresses(full_name, phone, city, state, pincode)
      )
    `)
    .order("created_at", { ascending: false });

  return <ReturnsClient initialReturns={data ?? []} />;
}