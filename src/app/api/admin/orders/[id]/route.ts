import { requireAdmin } from "@/lib/admin-guard";
import { ok, err, notFound, serverError } from "@/lib/api-response";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { status, delhivery_awb } = body;

    const { data, error: updateErr } = await supabase!
      .from("orders")
      .update({ status, delhivery_awb })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) return err(updateErr.message);
    if (!data) return notFound("Order");
    return ok(data);
  } catch (e) {
    return serverError(e);
  }
}