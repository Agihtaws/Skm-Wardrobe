import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();
    if (!email) return err("Email required");

    const displayName = name || "there";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:#db2777;padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                SKM WARDROBE
              </h1>
              <p style="margin:6px 0 0;color:#fce7f3;font-size:14px;">Your fashion destination</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:600;">
                Welcome, ${displayName}! 🎉
              </h2>
              <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
                We're thrilled to have you join SKM Wardrobe. Your account is ready — start exploring our latest collections today.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td style="background:#f3f4f6;border-radius:12px;padding:20px 24px;">
                    <p style="margin:0;color:#374151;font-size:14px;font-weight:600;">✨ What's waiting for you:</p>
                    <ul style="margin:10px 0 0;padding-left:18px;color:#6b7280;font-size:14px;line-height:1.8;">
                      <li>Trending styles for men &amp; women</li>
                      <li>Exclusive member offers</li>
                      <li>Easy returns &amp; fast shipping</li>
                    </ul>
                  </td>
                </tr>
              </table>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://skmwardrobe.in"}"
                style="display:inline-block;background:#db2777;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;">
                Shop Now →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
                You received this because you created an account at SKM Wardrobe.<br/>
                © ${new Date().getFullYear()} SKM Wardrobe. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SKM Wardrobe <noreply@skmwardrobe.in>",
        to: email,
        subject: `Welcome to SKM Wardrobe, ${displayName}! 🎉`,
        html,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      console.error("[Resend] Failed to send welcome email:", data);
      return err(data.message || "Failed to send email", 500);
    }

    return ok({ sent: true });
  } catch (e) {
    console.error("[Resend] Error:", e);
    return err("Server error", 500);
  }
}