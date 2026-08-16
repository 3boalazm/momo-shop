import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "../../server-lib/db.js";
import { applyCors, requireAdmin } from "../../server-lib/utils.js";

const VALID_STATUSES = ["Open", "Contacted", "Recovered", "Dismissed"];

/**
 * /api/abandoned-carts
 *   POST (public)          → capture a cart: { phone, name?, items, subtotal }
 *   GET  (admin)           → list, optional ?status=Open
 *   PATCH (admin) ?id=N    → update status: { status }
 * Merged into one function to stay within Vercel's Hobby limit.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  const db = getDb();

  // ---- Public capture ----
  if (req.method === "POST") {
    const phone = String(req.body?.phone || "").trim();
    const name = req.body?.name ? String(req.body.name).trim() : null;
    const items = req.body?.items;
    const subtotal = Number(req.body?.subtotal);

    if (!phone || !Array.isArray(items) || items.length === 0 || !Number.isFinite(subtotal)) {
      res.status(400).json({ error: "phone, items and subtotal are required" });
      return;
    }
    try {
      const [created] = await db
        .insert(schema.abandonedCarts)
        .values({ phone, name, items, subtotal: subtotal.toFixed(2) })
        .returning({ id: schema.abandonedCarts.id });
      res.status(201).json({ ok: true, id: created.id });
    } catch (err) {
      console.error("[abandoned-carts] capture failed:", err);
      res.status(500).json({ error: "Failed to save cart" });
    }
    return;
  }

  // ---- Admin routes ----
  if (!(await requireAdmin(req, res))) return;

  if (req.method === "GET") {
    try {
      const status = req.query.status as string | undefined;
      const rows =
        status && status !== "All"
          ? await db
              .select()
              .from(schema.abandonedCarts)
              .where(eq(schema.abandonedCarts.status, status as never))
              .orderBy(desc(schema.abandonedCarts.createdAt))
          : await db.select().from(schema.abandonedCarts).orderBy(desc(schema.abandonedCarts.createdAt));
      res.status(200).json({ carts: rows });
    } catch (err) {
      console.error("[abandoned-carts] list failed:", err);
      res.status(500).json({ error: "Failed to load carts" });
    }
    return;
  }

  if (req.method === "PATCH") {
    const id = Number(req.query.id);
    const status = req.body?.status;
    if (!Number.isInteger(id) || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: "Valid id and status are required" });
      return;
    }
    try {
      await db
        .update(schema.abandonedCarts)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.abandonedCarts.id, id));
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[abandoned-carts] update failed:", err);
      res.status(500).json({ error: "Failed to update cart" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
