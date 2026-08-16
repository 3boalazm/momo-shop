import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "../../../server-lib/db.js";
import { applyCors, requireAdmin, requireManager } from "../../../server-lib/utils.js";
import { couponInputSchema, couponUpdateSchema, computeDiscount } from "../../../shared/couponTypes.js";

/**
 * /api/admin/coupons              → list (GET, admin) / create (POST, admin)
 * /api/admin/coupons?id=N         → update (PATCH, admin) / delete (DELETE, admin)
 * /api/admin/coupons?validate=1   → validate a code at checkout (POST, PUBLIC)
 * Merged to stay within Vercel's Hobby function limit.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  // ---- Public coupon validation (checkout) — no admin auth required ----
  if (req.query.validate !== undefined) {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const code = String(req.body?.code || "").trim().toUpperCase();
    const subtotal = Number(req.body?.subtotal);
    if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
      res.status(400).json({ error: "code and subtotal are required" });
      return;
    }
    try {
      const db = getDb();
      const [coupon] = await db.select().from(schema.coupons).where(eq(schema.coupons.code, code));
      if (!coupon || !coupon.isActive) {
        res.status(404).json({ error: "Invalid coupon code" });
        return;
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        res.status(410).json({ error: "This coupon has expired" });
        return;
      }
      if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        res.status(410).json({ error: "This coupon has reached its usage limit" });
        return;
      }
      if (coupon.minSubtotal !== null && subtotal < Number(coupon.minSubtotal)) {
        res.status(422).json({
          error: `Minimum order of ${Number(coupon.minSubtotal).toLocaleString()} LE required for this coupon`,
        });
        return;
      }
      const discountAmount = computeDiscount(coupon.discountType, Number(coupon.value), subtotal);
      res.status(200).json({
        code: coupon.code,
        discountType: coupon.discountType,
        value: Number(coupon.value),
        discountAmount,
      });
    } catch (err) {
      console.error("[coupons validate] failed:", err);
      res.status(500).json({ error: "Failed to validate coupon" });
    }
    return;
  }

  // Viewing (GET) is open to any staff; creating/editing/deleting coupons needs manager+
  if (req.method === "GET") {
    if (!(await requireAdmin(req, res))) return;
  } else {
    if (!(await requireManager(req, res))) return;
  }

  const db = getDb();
  const hasId = req.query.id !== undefined;
  const id = Number(req.query.id);

  if (hasId) {
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid coupon id" });
      return;
    }

    if (req.method === "PATCH") {
      const parsed = couponUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid update", details: parsed.error.flatten() });
        return;
      }
      const u = parsed.data;
      try {
        await db
          .update(schema.coupons)
          .set({
            ...(u.code !== undefined && { code: u.code.toUpperCase() }),
            ...(u.discountType !== undefined && { discountType: u.discountType }),
            ...(u.value !== undefined && { value: u.value.toFixed(2) }),
            ...(u.minSubtotal !== undefined && { minSubtotal: u.minSubtotal.toFixed(2) }),
            ...(u.usageLimit !== undefined && { usageLimit: u.usageLimit }),
            ...(u.expiresAt !== undefined && { expiresAt: u.expiresAt ? new Date(u.expiresAt) : null }),
            ...(u.isActive !== undefined && { isActive: u.isActive }),
          })
          .where(eq(schema.coupons.id, id));
        res.status(200).json({ ok: true });
      } catch (err) {
        console.error("[admin/coupons/:id] update failed:", err);
        res.status(500).json({ error: "Failed to update coupon" });
      }
      return;
    }

    if (req.method === "DELETE") {
      try {
        await db.delete(schema.coupons).where(eq(schema.coupons.id, id));
        res.status(200).json({ ok: true });
      } catch (err) {
        console.error("[admin/coupons/:id] delete failed:", err);
        res.status(500).json({ error: "Failed to delete coupon" });
      }
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (req.method === "GET") {
    try {
      const rows = await db.select().from(schema.coupons).orderBy(desc(schema.coupons.createdAt));
      res.status(200).json({ coupons: rows });
    } catch (err) {
      console.error("[admin/coupons] list failed:", err);
      res.status(500).json({ error: "Failed to load coupons" });
    }
    return;
  }

  if (req.method === "POST") {
    const parsed = couponInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid coupon", details: parsed.error.flatten() });
      return;
    }
    const c = parsed.data;
    try {
      const [created] = await db
        .insert(schema.coupons)
        .values({
          code: c.code.toUpperCase(),
          discountType: c.discountType,
          value: c.value.toFixed(2),
          minSubtotal: c.minSubtotal?.toFixed(2),
          usageLimit: c.usageLimit,
          expiresAt: c.expiresAt ? new Date(c.expiresAt) : null,
          isActive: c.isActive,
        })
        .returning();
      res.status(201).json({ coupon: created });
    } catch (err) {
      if (err instanceof Error && err.message.includes("unique")) {
        res.status(409).json({ error: "A coupon with this code already exists" });
        return;
      }
      console.error("[admin/coupons] create failed:", err);
      res.status(500).json({ error: "Failed to create coupon" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
