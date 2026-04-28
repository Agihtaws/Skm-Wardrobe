import { requireAdmin } from "@/lib/admin-guard";
import { ok, err, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { data, error: dbErr } = await supabase!
      .from("attributes")
      .select("*, values:attribute_values(*)")
      .order("name");

    if (dbErr) return err(dbErr.message);
    return ok(data);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(request: Request) {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { name } = await request.json();
    if (!name?.trim()) return err("Name is required");

    const { data, error: dbErr } = await supabase!
      .from("attributes")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (dbErr) return err(dbErr.message);
    return ok(data, 201);
  } catch (e) {
    return serverError(e);
  }
}