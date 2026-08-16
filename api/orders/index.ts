import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, and, sql, desc } from "drizzle-orm";
import { getDb, schema } from "../../server-lib/db.js";
import { sendOrderEmail } from "../../server-lib/email.js";
import { generateOrderNumber, applyCors, describeServerError } from "../../server-lib/utils.js";
import { createOrderSchema, computeTotals } from "../../shared/orderTypes.js";
import { computeDiscount } from "../../shared/couponTypes.js";
import { getSession } from "../../server-lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  // --- Authenticated: GET /api/orders?mine=1 — the logged-in customer's own orders ---
  if (req.method === "GET" && req.query.mine !== undefined) {
    const session = await getSession(req);
    if (!session) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.userId, session.userId))
        .orderBy(desc(schema.orders.createdAt));
      res.status(200).json({ orders: rows });
    } catch (err) {
      console.error("[orders mine] failed:", err);
      res.status(500).json({ error: "Failed to load your orders" });
    }
    return;
  }

  // --- Public order tracking: GET /api/orders?track=<orderNumber>&phone=<phone> ---
  if (req.method === "GET") {
    const orderNumber = String(req.query.track || "").trim();
    const phone = String(req.query.phone || "").trim();
    if (!orderNumber || !phone) {
      res.status(400).json({ error: "Order number and phone are required" });
      return;
    }
    try {
      const db = getDb();
      const [order] = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.orderNumber, orderNumber));

      // Verify both the order number AND phone match (privacy: don't leak others' orders)
      const normalize = (p: string) => p.replace(/[\s\-+]/g, "").replace(/^20/, "0");
      if (!order || normalize(order.shippingPhone) !== normalize(phone)) {
        res.status(404).json({ error: "No order found with that number and phone" });
        return;
      }

      const items = await db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, order.id));

      // Return only what the customer needs (no internal fields)
      res.status(200).json({
        order: {
          orderNumber: order.orderNumber,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          total: order.total,
          createdAt: order.createdAt,
          shippingFirstName: order.shippingFirstName,
          shippingCity: order.shippingCity,
        },
        items: items.map((it) => ({
          productName: it.productName,
          color: it.color,
          size: it.size,
          quantity: it.quantity,
        })),
      });
    } catch (err) {
      console.error("[orders track] failed:", err);
      res.status(500).json({ error: "Failed to look up order" });
    }
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Validate payload
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order data", details: parsed.error.flatten() });
    return;
  }
  const input = parsed.data;

  // If the shopper is logged in, link this order to their account (best-effort, optional)
  const session = await getSession(req);

  // Server-side total computation (never trust client totals)
  const { subtotal, shippingCost } = computeTotals(input.items, input.shipping.governorate);
  const orderNumber = generateOrderNumber();

  try {
    const db = getDb();

    // --- Stock check: resolve each item to a variant and ensure enough stock ---
    // Items reference a product by slug + color + size. We look up the variant via
    // the product, then its variant row.
    const stockIssues: string[] = [];
    const variantUpdates: { variantId: number; newStock: number }[] = [];

    for (const it of input.items) {
      if (!it.productSlug) continue; // can't check stock without a slug; allow (legacy)
      const [product] = await db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(eq(schema.products.slug, it.productSlug));
      if (!product) continue; // product not in DB (static fallback item) — skip check

      const [variant] = await db
        .select({ id: schema.productVariants.id, stock: schema.productVariants.stock })
        .from(schema.productVariants)
        .where(
          and(
            eq(schema.productVariants.productId, product.id),
            eq(schema.productVariants.color, it.color),
            eq(schema.productVariants.size, it.size as typeof schema.productVariants.size.enumValues[number])
          )
        );

      if (!variant) continue; // variant combo not tracked — skip
      if (variant.stock < it.quantity) {
        stockIssues.push(`${it.productName} (${it.color}/${it.size}) — only ${variant.stock} left`);
      } else {
        variantUpdates.push({ variantId: variant.id, newStock: variant.stock - it.quantity });
      }
    }

    if (stockIssues.length > 0) {
      res.status(409).json({ error: "Some items are out of stock", details: stockIssues });
      return;
    }

    // --- Coupon: validate server-side and compute discount ---
    let discount = 0;
    let appliedCouponCode: string | null = null;
    let couponRowId: number | null = null;
    if (input.couponCode) {
      const code = input.couponCode.trim().toUpperCase();
      const [coupon] = await db.select().from(schema.coupons).where(eq(schema.coupons.code, code));
      const now = new Date();
      const valid =
        coupon &&
        coupon.isActive &&
        (!coupon.expiresAt || new Date(coupon.expiresAt) >= now) &&
        (coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit) &&
        (coupon.minSubtotal === null || subtotal >= Number(coupon.minSubtotal));
      if (valid) {
        discount = computeDiscount(coupon.discountType, Number(coupon.value), subtotal);
        appliedCouponCode = coupon.code;
        couponRowId = coupon.id;
      }
      // Invalid coupons are silently ignored (order proceeds at full price)
    }

    const total = Math.max(0, subtotal + shippingCost - discount);

    // Insert order
    const [order] = await db
      .insert(schema.orders)
      .values({
        orderNumber,
        userId: session?.userId ?? null,
        status: "Pending",
        subtotal: subtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        discount: discount.toFixed(2),
        couponCode: appliedCouponCode,
        total: total.toFixed(2),
        paymentMethod: input.paymentMethod,
        paymentStatus: "Unpaid",
        shippingFirstName: input.shipping.firstName,
        shippingLastName: input.shipping.lastName,
        shippingEmail: input.shipping.email,
        shippingPhone: input.shipping.phone,
        shippingAddress: input.shipping.address,
        shippingCity: input.shipping.city,
        shippingGovernorate: input.shipping.governorate,
        shippingPostalCode: input.shipping.postalCode,
        shippingCountry: input.shipping.country,
        notes: input.notes,
      })
      .returning();

    // Insert order items
    const itemRows = input.items.map((it) => ({
      orderId: order.id,
      productName: it.productName,
      productSlug: it.productSlug,
      color: it.color,
      size: it.size,
      quantity: it.quantity,
      pricePerUnit: it.pricePerUnit.toFixed(2),
      subtotal: (it.pricePerUnit * it.quantity).toFixed(2),
    }));
    const insertedItems = await db.insert(schema.orderItems).values(itemRows).returning();

    // Decrement stock for resolved variants
    for (const u of variantUpdates) {
      await db
        .update(schema.productVariants)
        .set({ stock: u.newStock, updatedAt: new Date() })
        .where(eq(schema.productVariants.id, u.variantId));
    }

    // Bump coupon usage if one was applied
    if (couponRowId !== null) {
      await db
        .update(schema.coupons)
        .set({ usageCount: sql`${schema.coupons.usageCount} + 1` })
        .where(eq(schema.coupons.id, couponRowId));
    }

    // Fire email (must not fail the order)
    try {
      await sendOrderEmail(order, insertedItems);
    } catch (emailErr) {
      console.error("[orders] email failed (order still saved):", emailErr);
    }

    res.status(201).json({
      ok: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      total: order.total,
    });
  } catch (err) {
    console.error("[orders] create failed:", err);
    res.status(500).json({ error: describeServerError(err, "Failed to create order") });
  }
}
