import { requireAdmin } from "@/lib/admin-guard";
import { ok, err, notFound, serverError } from "@/lib/api-response";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();

    const { data, error: dbErr } = await supabase!
      .from("categories")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (dbErr) return err(dbErr.message);
    if (!data) return notFound("Category");
    return ok(data);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const { error: dbErr } = await supabase!
      .from("categories")
      .delete()
      .eq("id", id);

    if (dbErr) return err(dbErr.message);
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}