import { createClient } from "@/lib/supabase/server";
import { unauthorized, forbidden } from "@/lib/api-response";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: unauthorized(), supabase: null, user: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: forbidden(), supabase: null, user: null };

  return { error: null, supabase, user };
}