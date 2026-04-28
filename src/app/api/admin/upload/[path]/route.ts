import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, serverError } from "@/lib/api-response";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { path } = await params;
    const adminSupabase = createAdminClient();

    const { error: delErr } = await adminSupabase.storage
      .from("products")
      .remove([decodeURIComponent(path)]);

    if (delErr) return err(delErr.message);
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}