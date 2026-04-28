import { requireAdmin } from "@/lib/admin-guard";
import { ok, err, notFound, serverError } from "@/lib/api-response";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { product_attributes, ...productData } = body;

    const { data: product, error: updateErr } = await supabase!
      .from("products").update(productData).eq("id", id).select().single();

    if (updateErr) return err(updateErr.message);
    if (!product) return notFound("Product");

    // Replace all attributes
    await supabase!.from("product_attributes").delete().eq("product_id", id);

    if (product_attributes?.length) {
      const attrs = product_attributes.map((a: any) => ({
        product_id: id,
        attribute_id: a.attrId,
        attribute_value_id: a.valueId,
      }));
      await supabase!.from("product_attributes").insert(attrs);
    }

    return ok(product);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const { error: delErr } = await supabase!.from("products").delete().eq("id", id);
    if (delErr) return err(delErr.message);

    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}