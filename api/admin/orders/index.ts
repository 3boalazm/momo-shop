import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq, and, sql } from "drizzle-orm";
import { getDb, schema } from "../../../server-lib/db.js";
import { applyCors, requireAdmin } from "../../../server-lib/utils.js";
import { computeEarnedPoints } from "../../../shared/loyalty.js";

const VALID_STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

/**
 * /api/admin/orders?status=Pending  → list (GET)
 * /api/admin/orders?id=N            → detail (GET) / change status (PATCH)
 * Merged to stay within Vercel's Hobby function limit.
 *
 * On cancellation, stock for the order's items is restored to inventory.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!(await requireAdmin(req, res))) return;

  const db = getDb();
  const hasId = req.query.id !== undefined;
  const id = Number(req.query.id);

  // ---- Single order (?id=N) ----
  if (hasId) {
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }

    if (req.method === "GET") {
      try {
        const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
        if (!order) {
          res.status(404).json({ error: "Order not found" });
          return;
        }
        const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id));
        res.status(200).json({ order, items });
      } catch (err) {
        console.error("[admin/orders/:id] get failed:", err);
        res.status(500).json({ error: "Failed to load order" });
      }
      return;
    }

    if (req.method === "PATCH") {
      const status = req.body?.status;
      if (!VALID_STATUSES.includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }
      try {
        // Read current status first (to detect a transition INTO Cancelled/Delivered)
        const [current] = await db
          .select({ status: schema.orders.status, userId: schema.orders.userId, total: schema.orders.total })
          .from(schema.orders)
          .where(eq(schema.orders.id, id));
        if (!current) {
          res.status(404).json({ error: "Order not found" });
          return;
        }

        await db
          .update(schema.orders)
          .set({ status, updatedAt: new Date() })
          .where(eq(schema.orders.id, id));

        // If newly cancelled, restore stock for each item's variant
        if (status === "Cancelled" && current.status !== "Cancelled") {
          const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id));
          for (const it of items) {
            if (!it.productSlug) continue;
            const [product] = await db
              .select({ id: schema.products.id })
              .from(schema.products)
              .where(eq(schema.products.slug, it.productSlug));
            if (!product) continue;
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
            if (variant) {
              await db
                .update(schema.productVariants)
                .set({ stock: variant.stock + it.quantity, updatedAt: new Date() })
                .where(eq(schema.productVariants.id, variant.id));
            }
          }
        }

        // Award loyalty points on first transition into Delivered (linked accounts only)
        if (status === "Delivered" && current.status !== "Delivered" && current.userId) {
          const points = computeEarnedPoints(Number(current.total));
          if (points > 0) {
            await db.insert(schema.loyaltyTransactions).values({
              userId: current.userId,
              type: "earn",
              points,
              orderId: id,
              note: `Order #${id} delivered`,
            });
            await db
              .update(schema.users)
              .set({ loyaltyPoints: sql`${schema.users.loyaltyPoints} + ${points}` })
              .where(eq(schema.users.id, current.userId));
          }
        }

        res.status(200).json({ ok: true });
      } catch (err) {
        console.error("[admin/orders/:id] update failed:", err);
        res.status(500).json({ error: "Failed to update order" });
      }
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // ---- List ----
  if (req.method === "GET") {
    try {
      const status = req.query.status as string | undefined;
      const rows =
        status && status !== "All"
          ? await db
              .select()
              .from(schema.orders)
              .where(eq(schema.orders.status, status as never))
              .orderBy(desc(schema.orders.createdAt))
          : await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt));
      res.status(200).json({ orders: rows });
    } catch (err) {
      console.error("[admin/orders] list failed:", err);
      res.status(500).json({ error: "Failed to load orders" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
