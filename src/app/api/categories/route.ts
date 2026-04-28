import { createClient } from "@/lib/supabase/server";
import { ok, serverError } from "@/lib/api-response";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const gender = request.nextUrl.searchParams.get("gender");

    let query = supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (gender) query = query.eq("gender", gender);

    const { data, error } = await query;
    if (error) throw error;

    return ok(data);
  } catch (e) {
    return serverError(e);
  }
}