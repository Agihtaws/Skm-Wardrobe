import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM    = "SKM Wardrobe <orders@skmwardrobe.in>";
const BASE    = "https://skmwardrobe.in";
const PINK    = "#db2777";
const BG      = "#fdf2f8";

// ── Generic send helper ────────────────────────────────────────────────
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) console.error("[Email] Resend error:", error);
    else       console.log("[Email] Sent →", to, "|", subject);
  } catch (e) {
    // Never crash the main flow because of email failure
    console.error("[Email] Failed:", e);
  }
}

// ── Shared layout wrapper ──────────────────────────────────────────────
function layout(body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG};font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">

  <!-- Header -->
  <tr><td style="background:${PINK};padding:28px 32px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:.5px">SKM WARDROBE</h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px">
    ${body}
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #f3f4f6">
    <p style="margin:0;color:#9ca3af;font-size:12px">
      Questions? Reply to this email or visit <a href="${BASE}" style="color:${PINK}">${BASE}</a>
    </p>
    <p style="margin:6px 0 0;color:#d1d5db;font-size:11px">© SKM Wardrobe, Kumbakonam</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

function orderLink(orderId: string) {
  return `${BASE}/orders/${orderId}`;
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:${PINK};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">${text}</a>`;
}

function statusBadge(label: string, color: string) {
  return `<span style="display:inline-block;padding:4px 14px;background:${color}22;color:${color};border-radius:20px;font-size:13px;font-weight:600">${label}</span>`;
}

function itemsTable(items: { name: string; qty: number; price: number; size?: string | null }[]) {
  const rows = items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151">
        ${i.name}${i.size ? ` <span style="font-size:12px;color:#9ca3af">(Size: ${i.size})</span>` : ""}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;text-align:center">×${i.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;text-align:right;font-weight:600">
        ₹${(i.price * i.qty).toLocaleString("en-IN")}
      </td>
    </tr>`).join("");
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">
      <thead>
        <tr>
          <th style="text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e5e7eb">Item</th>
          <th style="text-align:center;font-size:11px;color:#9ca3af;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e5e7eb">Qty</th>
          <th style="text-align:right;font-size:11px;color:#9ca3af;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #e5e7eb">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Templates ──────────────────────────────────────────────────────────

interface OrderEmailParams {
  orderId:       string;
  customerName:  string;
  items:         { name: string; qty: number; price: number; size?: string | null }[];
  total:         number;
  paymentMethod: "cod" | "online";
}

// 1. Order placed (COD)
export function emailOrderPlaced(p: OrderEmailParams) {
  return layout(`
    <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${p.customerName},</p>
    <h2 style="margin:8px 0 4px;font-size:20px;color:#111827">Your order is confirmed! 🎉</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280">Order ID: <strong style="color:#111827">#${p.orderId.slice(0,8).toUpperCase()}</strong></p>
    ${statusBadge("Cash on Delivery", "#16a34a")}
    ${itemsTable(p.items)}
    <table width="100%" style="margin-top:16px">
      <tr><td style="font-size:14px;color:#6b7280;padding:4px 0">Total</td>
          <td style="font-size:16px;font-weight:700;color:#111827;text-align:right">₹${p.total.toLocaleString("en-IN")}</td></tr>
    </table>
    <p style="margin-top:20px;font-size:14px;color:#6b7280">We'll notify you when your order is shipped. Pay <strong>₹${p.total.toLocaleString("en-IN")}</strong> in cash when it arrives.</p>
    ${btn("View Order", orderLink(p.orderId))}
  `);
}

// 2. Payment confirmed (Online)
export function emailPaymentConfirmed(p: OrderEmailParams) {
  return layout(`
    <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${p.customerName},</p>
    <h2 style="margin:8px 0 4px;font-size:20px;color:#111827">Payment received! ✅</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280">Order ID: <strong style="color:#111827">#${p.orderId.slice(0,8).toUpperCase()}</strong></p>
    ${statusBadge("Paid Online", "#2563eb")}
    ${itemsTable(p.items)}
    <table width="100%" style="margin-top:16px">
      <tr><td style="font-size:14px;color:#6b7280;padding:4px 0">Total Paid</td>
          <td style="font-size:16px;font-weight:700;color:#111827;text-align:right">₹${p.total.toLocaleString("en-IN")}</td></tr>
    </table>
    <p style="margin-top:20px;font-size:14px;color:#6b7280">Your payment is confirmed. We'll pack and ship within 1–2 business days.</p>
    ${btn("View Order", orderLink(p.orderId))}
  `);
}

// 3. Processing
export function emailOrderProcessing(orderId: string, customerName: string) {
  return layout(`
    <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${customerName},</p>
    <h2 style="margin:8px 0 4px;font-size:20px;color:#111827">We're packing your order 📦</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280">Order ID: <strong style="color:#111827">#${orderId.slice(0,8).toUpperCase()}</strong></p>
    ${statusBadge("Processing", "#d97706")}
    <p style="margin-top:20px;font-size:14px;color:#6b7280">Your order is being processed and will be handed over to our courier soon. You'll receive a shipping confirmation with tracking details shortly.</p>
    ${btn("View Order", orderLink(orderId))}
  `);
}

// 4. Shipped
export function emailOrderShipped(orderId: string, customerName: string, awb?: string | null) {
  return layout(`
    <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${customerName},</p>
    <h2 style="margin:8px 0 4px;font-size:20px;color:#111827">Your order is on the way! 🚚</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280">Order ID: <strong style="color:#111827">#${orderId.slice(0,8).toUpperCase()}</strong></p>
    ${statusBadge("Shipped", "#7c3aed")}
    ${awb ? `
    <div style="margin-top:20px;padding:16px;background:#f5f3ff;border-radius:10px;border:1px solid #ede9fe">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#7c3aed;text-transform:uppercase">Tracking Number (AWB)</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#4c1d95;font-family:monospace">${awb}</p>
      <a href="https://www.delhivery.com/track/package/${awb}" style="display:inline-block;margin-top:8px;font-size:13px;color:#7c3aed">Track your package →</a>
    </div>` : ""}
    <p style="margin-top:20px;font-size:14px;color:#6b7280">Expected delivery in 3–5 business days. You can track your package using the AWB number above.</p>
    ${btn("View Order", orderLink(orderId))}
  `);
}

// 5. Delivered
export function emailOrderDelivered(orderId: string, customerName: string) {
  return layout(`
    <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${customerName},</p>
    <h2 style="margin:8px 0 4px;font-size:20px;color:#111827">Your order has been delivered! 🎁</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280">Order ID: <strong style="color:#111827">#${orderId.slice(0,8).toUpperCase()}</strong></p>
    ${statusBadge("Delivered", "#16a34a")}
    <p style="margin-top:20px;font-size:14px;color:#6b7280">We hope you love your purchase! If anything is wrong, you have <strong>3 days</strong> to raise a return request from your order page.</p>
    ${btn("View Order & Return", orderLink(orderId))}
  `);
}

// 6. Cancelled
export function emailOrderCancelled(orderId: string, customerName: string, refundNote?: string) {
  return layout(`
    <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${customerName},</p>
    <h2 style="margin:8px 0 4px;font-size:20px;color:#111827">Order cancelled</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280">Order ID: <strong style="color:#111827">#${orderId.slice(0,8).toUpperCase()}</strong></p>
    ${statusBadge("Cancelled", "#dc2626")}
    <p style="margin-top:20px;font-size:14px;color:#6b7280">
      Your order has been cancelled and stock has been released.
      ${refundNote ? `<br><br><strong>${refundNote}</strong>` : ""}
    </p>
    <a href="${BASE}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:${PINK};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Continue Shopping</a>
  `);
}

// 7. Return requested
export function emailReturnRequested(orderId: string, customerName: string, reason: string) {
  return layout(`
    <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${customerName},</p>
    <h2 style="margin:8px 0 4px;font-size:20px;color:#111827">Return request received 🔄</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280">Order ID: <strong style="color:#111827">#${orderId.slice(0,8).toUpperCase()}</strong></p>
    ${statusBadge("Return Requested", "#ea580c")}
    <div style="margin-top:20px;padding:16px;background:#fff7ed;border-radius:10px;border:1px solid #fed7aa">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#ea580c;text-transform:uppercase">Reason</p>
      <p style="margin:0;font-size:14px;color:#7c2d12">${reason}</p>
    </div>
    <p style="margin-top:20px;font-size:14px;color:#6b7280">We've received your return request. Our team will review it and arrange a pickup within 24–48 hours. Refund will be processed after we receive the product.</p>
    ${btn("View Order", orderLink(orderId))}
  `);
}

// 8. Refunded
export function emailRefunded(orderId: string, customerName: string, amount: number, isOnline: boolean) {
  return layout(`
    <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${customerName},</p>
    <h2 style="margin:8px 0 4px;font-size:20px;color:#111827">Refund initiated ✅</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280">Order ID: <strong style="color:#111827">#${orderId.slice(0,8).toUpperCase()}</strong></p>
    ${statusBadge("Refunded", "#16a34a")}
    <div style="margin-top:20px;padding:16px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#16a34a;text-transform:uppercase">Refund Amount</p>
      <p style="margin:0;font-size:22px;font-weight:700;color:#14532d">₹${amount.toLocaleString("en-IN")}</p>
    </div>
    <p style="margin-top:20px;font-size:14px;color:#6b7280">
      ${isOnline
        ? "Your refund has been initiated to your original payment method (UPI/Card/Bank). It will reflect in <strong>5–7 business days</strong>."
        : "Since you paid Cash on Delivery, our team will transfer the refund to you directly. Please check your phone for further communication."}
    </p>
    ${btn("View Order", orderLink(orderId))}
  `);
}