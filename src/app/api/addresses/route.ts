import { createClient } from "@/lib/supabase/server";
import { ok, err, unauthorized, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    return ok(data ?? []);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const { full_name, phone, line1, line2, city, state, pincode, is_default } = body;

    if (!full_name || !phone || !line1 || !city || !state || !pincode)
      return err("All required fields must be filled");

    if (!/^\d{10}$/.test(phone))  return err("Enter valid 10-digit phone number");
    if (!/^\d{6}$/.test(pincode)) return err("Enter valid 6-digit pincode");

    // If this is default, unset others
    if (is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    const { data, error } = await supabase
      .from("addresses")
      .insert({ user_id: user.id, full_name, phone, line1, line2: line2 || null, city, state, pincode, is_default: !!is_default })
      .select()
      .single();

    if (error) return err(error.message);
    return ok(data, 201);
  } catch (e) {
    return serverError(e);
  }
}