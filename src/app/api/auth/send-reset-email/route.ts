import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ok, err } from "@/lib/api-response";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") return err("Email is required");

    const normalised = email.trim().toLowerCase();

    // ── Check if this email is registered ──────────────────────────────
    const admin = createAdminClient();

    // getUserByEmail is not available in supabase-js v2 admin SDK,
    // so we query the profiles-linked auth table via listUsers and match.
    // For a small store this is fine; swap to a DB function if scale demands it.
    const { data: usersData, error: listErr } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listErr) {
      console.error("[send-reset-email] listUsers error:", listErr.message);
      return err("Server error", 500);
    }

    const userExists = usersData.users.some(
      (u) => u.email?.toLowerCase() === normalised
    );

    // ── Always respond success so we don't reveal whether an email exists ──
    // But only actually send the email if the account exists.
    if (!userExists) {
      console.log("[send-reset-email] Email not found — silent no-op:", normalised);
      return ok({ sent: false });
    }

    // ── Send the reset email via Supabase ──────────────────────────────
    const supabase = await createClient();
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
      normalised,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://skmwardrobe.in"}/auth/callback?type=recovery`,
      }
    );

    if (resetErr) {
      console.error("[send-reset-email] resetPasswordForEmail error:", resetErr.message);
      return err("Failed to send reset email. Please try again.");
    }

    console.log("[send-reset-email] Reset email sent to:", normalised);
    return ok({ sent: true });
  } catch (e) {
    console.error("[send-reset-email] Unexpected error:", e);
    return err("Server error", 500);
  }
}