import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb, schema } from "../../server-lib/db.js";
import { applyCors } from "../../server-lib/utils.js";
import { reviewInputSchema } from "../../shared/reviewTypes.js";

/**
 * GET  /api/reviews?productId=1  → approved reviews + rating summary
 * POST /api/reviews              → submit a review (saved as Pending)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  const db = getDb();

  if (req.method === "GET") {
    const productId = Number(req.query.productId);
    if (!Number.isInteger(productId)) {
      res.status(400).json({ error: "productId is required" });
      return;
    }
    try {
      const rows = await db
        .select()
        .from(schema.reviews)
        .where(and(eq(schema.reviews.productId, productId), eq(schema.reviews.status, "Approved")))
        .orderBy(desc(schema.reviews.createdAt));

      const [summary] = await db
        .select({
          count: sql<number>`count(*)::int`,
          avg: sql<string>`coalesce(avg(${schema.reviews.rating}), 0)`,
        })
        .from(schema.reviews)
        .where(and(eq(schema.reviews.productId, productId), eq(schema.reviews.status, "Approved")));

      res.status(200).json({
        reviews: rows,
        count: summary?.count ?? 0,
        average: Number(summary?.avg ?? 0),
      });
    } catch (err) {
      console.error("[reviews] list failed:", err);
      res.status(500).json({ error: "Failed to load reviews" });
    }
    return;
  }

  if (req.method === "POST") {
    const parsed = reviewInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid review", details: parsed.error.flatten() });
      return;
    }
    const r = parsed.data;
    try {
      await db.insert(schema.reviews).values({
        productId: r.productId,
        authorName: r.authorName,
        rating: r.rating,
        title: r.title,
        body: r.body,
        status: "Pending",
      });
      res.status(201).json({ ok: true, message: "Review submitted for approval" });
    } catch (err) {
      console.error("[reviews] create failed:", err);
      res.status(500).json({ error: "Failed to submit review" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
