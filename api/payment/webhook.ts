import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../server-lib/db.js";
import { verifyWebhookHmac } from "../../server-lib/paymob.js";

/**
 * POST /api/payment/webhook?hmac=...
 * Paymob's transaction-processed callback. Verifies HMAC, then marks the
 * matching order Paid (and Confirmed) on success.
 *
 * Configure this URL in the Paymob dashboard as the Transaction Processed Callback.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const receivedHmac = (req.query.hmac as string) || "";
  const body = req.body as { obj?: Record<string, unknown> };
  const txn = body?.obj;

  if (!txn) {
    res.status(400).json({ error: "Missing transaction object" });
    return;
  }

  // Verify authenticity
  if (!verifyWebhookHmac(txn, receivedHmac)) {
    console.warn("[payment/webhook] HMAC verification failed");
    res.status(401).json({ error: "Invalid HMAC" });
    return;
  }

  const success = txn.success === true || txn.success === "true";
  // special_reference carries our order number (set when creating the intention)
  const orderNumber =
    ((txn.order as Record<string, unknown>)?.merchant_order_id as string) ||
    ((txn.extras as Record<string, unknown>)?.order_number as string) ||
    (txn.special_reference as string) ||
    "";

  if (!orderNumber) {
    // Acknowledge so Paymob doesn't retry forever, but log it
    console.warn("[payment/webhook] no order reference in transaction");
    res.status(200).json({ ok: true });
    return;
  }

  try {
    const db = getDb();
    if (success) {
      await db
        .update(schema.orders)
        .set({ paymentStatus: "Paid", status: "Confirmed", updatedAt: new Date() })
        .where(eq(schema.orders.orderNumber, orderNumber));
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[payment/webhook] db update failed:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
}
