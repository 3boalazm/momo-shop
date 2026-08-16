import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../server-lib/db.js";
import { applyCors } from "../../server-lib/utils.js";
import { createPaymentIntention } from "../../server-lib/paymob.js";

/**
 * POST /api/payment/intention
 * Body: { orderId: number }
 * Creates a Paymob intention for an existing (Unpaid, Online) order and returns
 * the client_secret + public key for the browser to open checkout.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const orderId = Number(req.body?.orderId);
  if (!Number.isInteger(orderId)) {
    res.status(400).json({ error: "orderId is required" });
    return;
  }

  try {
    const db = getDb();
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (order.paymentStatus === "Paid") {
      res.status(409).json({ error: "Order already paid" });
      return;
    }

    const items = await db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, orderId));

    const intention = await createPaymentIntention({
      amountCents: Math.round(Number(order.total) * 100),
      orderNumber: order.orderNumber,
      items: items.map((it) => ({
        name: it.productName,
        amount: Math.round(Number(it.pricePerUnit) * 100),
        description: `${it.color} / ${it.size}`,
        quantity: it.quantity,
      })),
      billing: {
        firstName: order.shippingFirstName,
        lastName: order.shippingLastName,
        email: order.shippingEmail,
        phone: order.shippingPhone,
        city: order.shippingCity,
        country: "EG",
        street: order.shippingAddress,
      },
    });

    res.status(200).json(intention);
  } catch (err) {
    console.error("[payment/intention] failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to create payment" });
  }
}
