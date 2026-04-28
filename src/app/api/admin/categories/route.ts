import { requireAdmin } from "@/lib/admin-guard";
import { ok, err, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { data, error: dbErr } = await supabase!
      .from("categories")
      .select("*")
      .order("gender")
      .order("sort_order");

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

    const body = await request.json();
    const { data, error: dbErr } = await supabase!
      .from("categories")
      .insert(body)
      .select()
      .single();

    if (dbErr) return err(dbErr.message);
    return ok(data, 201);
  } catch (e) {
    return serverError(e);
  }
}