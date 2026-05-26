import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Password reset flow → go to reset page
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // Detect new Google OAuth user and send welcome email
      // If account was created within the last 30 seconds, it's a new signup
      const user = data?.user;
      if (user?.email) {
        const createdAt = new Date(user.created_at).getTime();
        const now = Date.now();
        const isNewUser = now - createdAt < 30_000;

        if (isNewUser) {
          const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email.split("@")[0];

          // Fire-and-forget — don't block the redirect
          fetch(`${origin}/api/auth/welcome`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email, name }),
          }).catch(() => {});
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}