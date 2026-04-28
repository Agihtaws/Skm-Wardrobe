import { requireAdmin } from "@/lib/admin-guard";
import { ok, err, serverError } from "@/lib/api-response";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const { error: dbErr } = await supabase!
      .from("attributes")
      .delete()
      .eq("id", id);

    if (dbErr) return err(dbErr.message);
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}