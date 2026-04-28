import { createClient } from "@/lib/supabase/server";
import { ok, err, unauthorized, serverError } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { product_id } = await request.json();
    if (!product_id) return err("product_id required");

    const { error } = await supabase
      .from("cart")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", product_id);

    if (error) return err(error.message);
    return ok({ removed: true });
  } catch (e) {
    return serverError(e);
  }
}