import { requireAdmin } from "@/lib/admin-guard";
import { ok, err, serverError } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { attribute_id, value } = await request.json();
    if (!attribute_id || !value?.trim()) return err("attribute_id and value required");

    const { data, error: dbErr } = await supabase!
      .from("attribute_values")
      .insert({ attribute_id, value: value.trim() })
      .select()
      .single();

    if (dbErr) return err(dbErr.message);
    return ok(data, 201);
  } catch (e) {
    return serverError(e);
  }
}