import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "../../../server-lib/db.js";
import { applyCors, requireAdmin } from "../../../server-lib/utils.js";

/**
 * /api/admin/reviews?status=Pending  → list (GET)
 * /api/admin/reviews?id=N            → moderate (PATCH) / delete (DELETE)
 * Merged to stay within Vercel's Hobby function limit.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!(await requireAdmin(req, res))) return;

  const db = getDb();
  const hasId = req.query.id !== undefined;
  const id = Number(req.query.id);

  if (hasId) {
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid review id" });
      return;
    }

    if (req.method === "PATCH") {
      const status = req.body?.status;
      if (!["Approved", "Rejected", "Pending"].includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }
      try {
        await db.update(schema.reviews).set({ status }).where(eq(schema.reviews.id, id));
        res.status(200).json({ ok: true });
      } catch (err) {
        console.error("[admin/reviews/:id] update failed:", err);
        res.status(500).json({ error: "Failed to update review" });
      }
      return;
    }

    if (req.method === "DELETE") {
      try {
        await db.delete(schema.reviews).where(eq(schema.reviews.id, id));
        res.status(200).json({ ok: true });
      } catch (err) {
        console.error("[admin/reviews/:id] delete failed:", err);
        res.status(500).json({ error: "Failed to delete review" });
      }
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (req.method === "GET") {
    try {
      const status = req.query.status as string | undefined;
      const base = db
        .select({
          id: schema.reviews.id,
          productId: schema.reviews.productId,
          productName: schema.products.name,
          authorName: schema.reviews.authorName,
          rating: schema.reviews.rating,
          title: schema.reviews.title,
          body: schema.reviews.body,
          status: schema.reviews.status,
          createdAt: schema.reviews.createdAt,
        })
        .from(schema.reviews)
        .leftJoin(schema.products, eq(schema.reviews.productId, schema.products.id))
        .orderBy(desc(schema.reviews.createdAt));

      const rows =
        status && status !== "All"
          ? await base.where(eq(schema.reviews.status, status as "Pending" | "Approved" | "Rejected"))
          : await base;

      res.status(200).json({ reviews: rows });
    } catch (err) {
      console.error("[admin/reviews] list failed:", err);
      res.status(500).json({ error: "Failed to load reviews" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
