import { createClient } from "@/lib/supabase/server";
import { ok, err, unauthorized, serverError } from "@/lib/api-response";

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { full_name, phone } = await request.json();

    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: full_name?.trim() || null, phone: phone?.trim() || null })
      .eq("id", user.id)
      .select()
      .single();

    if (error) return err(error.message);
    return ok(data);
  } catch (e) {
    return serverError(e);
  }
}