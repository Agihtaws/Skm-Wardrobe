import { createClient } from "@/lib/supabase/server";
import { ok, notFound, serverError } from "@/lib/api-response";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(id, name, slug, gender, parent_id)")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) return notFound("Product");
    return ok(data);
  } catch (e) {
    return serverError(e);
  }
}