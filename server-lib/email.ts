import nodemailer from "nodemailer";
import type { Order, OrderItem } from "../drizzle/schema.js";

/**
 * Sends the new-order notification to the brand owner via Gmail SMTP.
 * Requires GMAIL_USER + GMAIL_APP_PASSWORD (App Password, NOT account password).
 * ADMIN_EMAIL is the recipient. All are set in Vercel env vars.
 *
 * Failure to email must NOT fail the order — caller wraps this in try/catch.
 */
export async function sendOrderEmail(order: Order, items: OrderItem[]): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.ADMIN_EMAIL || "mizohazembargal@gmail.com";

  if (!user || !pass) {
    console.warn("[email] GMAIL_USER / GMAIL_APP_PASSWORD not set — skipping email");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const itemsRows = items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(it.productName)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(it.color)} / ${escapeHtml(it.size)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${it.subtotal} LE</td>
      </tr>`
    )
    .join("");

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111">
    <div style="background:#0a0a0a;color:#fff;padding:24px;text-align:center">
      <h1 style="margin:0;font-size:24px">ÉLAN<span style="color:#ff5722">.</span> — New Order</h1>
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 4px">Order ${escapeHtml(order.orderNumber)}</h2>
      <p style="color:#666;margin:0 0 16px">${new Date(order.createdAt).toLocaleString("en-EG")}</p>

      <h3>Customer</h3>
      <p style="margin:4px 0">${escapeHtml(order.shippingFirstName)} ${escapeHtml(order.shippingLastName)}</p>
      <p style="margin:4px 0">📞 ${escapeHtml(order.shippingPhone)}</p>
      <p style="margin:4px 0">✉️ ${escapeHtml(order.shippingEmail)}</p>
      <p style="margin:4px 0">📍 ${escapeHtml(order.shippingAddress)}, ${escapeHtml(order.shippingCity)}, ${escapeHtml(order.shippingCountry)}</p>

      <h3 style="margin-top:24px">Items</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f5f5f5;text-align:left">
            <th style="padding:8px">Product</th>
            <th style="padding:8px">Variant</th>
            <th style="padding:8px;text-align:center">Qty</th>
            <th style="padding:8px;text-align:right">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>

      <div style="margin-top:16px;text-align:right">
        <p style="margin:4px 0">Subtotal: ${order.subtotal} LE</p>
        <p style="margin:4px 0">Shipping: ${order.shippingCost} LE</p>
        <p style="margin:8px 0;font-size:20px;font-weight:bold">Total: ${order.total} LE</p>
      </div>

      <div style="margin-top:16px;padding:12px;background:#fff3e0;border-left:4px solid #ff5722">
        <strong>Payment:</strong> ${order.paymentMethod === "COD" ? "Cash on Delivery" : "Online"}
        &nbsp;·&nbsp; <strong>Status:</strong> ${order.status}
      </div>
      ${order.notes ? `<p style="margin-top:16px"><strong>Notes:</strong> ${escapeHtml(order.notes)}</p>` : ""}
    </div>
  </div>`;

  await transporter.sendMail({
    from: `"Élan Collective" <${user}>`,
    to,
    subject: `🛍️ New Order ${order.orderNumber} — ${order.total} LE (${order.paymentMethod})`,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
