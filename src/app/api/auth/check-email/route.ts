import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err } from "@/lib/api-response";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return err("Email is required");

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers();

    if (error) return err("Server error", 500);

    const exists = data.users.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    return ok({ exists });
  } catch {
    return err("Server error", 500);
  }
}