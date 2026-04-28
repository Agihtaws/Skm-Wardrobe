import { createClient } from "@/lib/supabase/server";
import AttributesClient from "./AttributesClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Attributes" };
export const revalidate = 0;

export default async function AttributesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attributes")
    .select("*, values:attribute_values(*)")
    .order("name");
  return <AttributesClient initialAttributes={data ?? []} />;
}