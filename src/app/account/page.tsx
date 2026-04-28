import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileClient from "./ProfileClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const [{ data: profile }, { data: addresses }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("addresses").select("*").eq("user_id", user.id)
      .order("is_default", { ascending: false }),
  ]);

  return (
    <ProfileClient
      user={{ id: user.id, email: user.email ?? "" }}
      initialProfile={profile}
      initialAddresses={addresses ?? []}
    />
  );
}