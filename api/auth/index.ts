import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, desc, sql } from "drizzle-orm";
import { getDb, schema } from "../../server-lib/db.js";
import { applyCors, requireSuperAdmin, describeServerError } from "../../server-lib/utils.js";
import {
  hashPassword,
  verifyPassword,
  signSession,
  setSessionCookie,
  clearSessionCookie,
  getSession,
} from "../../server-lib/auth.js";
import { signupSchema, loginSchema, staffCreateSchema, staffUpdateSchema } from "../../shared/authTypes.js";
import { computeRedemptionValue, MIN_REDEEM_POINTS } from "../../shared/loyalty.js";

/**
 * /api/auth?action=signup           POST  { name, email, password, phone? }
 * /api/auth?action=login            POST  { email, password }
 * /api/auth?action=logout           POST
 * /api/auth?action=redeem-points    POST  { points }  (authenticated)
 * /api/auth?action=loyalty-history  GET   (authenticated)
 * /api/auth                         GET   → current session user (or 401)
 * Merged into one function to stay within Vercel's Hobby function limit.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  const db = getDb();
  const action = req.query.action as string | undefined;

  if (req.method === "GET" && action === "staff-list") {
    if (!(await requireSuperAdmin(req, res))) return;
    const rows = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        isActive: schema.users.isActive,
        createdAt: schema.users.createdAt,
        lastSignedIn: schema.users.lastSignedIn,
      })
      .from(schema.users)
      .where(sql`${schema.users.role} <> 'user'`)
      .orderBy(desc(schema.users.createdAt));
    res.status(200).json({ staff: rows });
    return;
  }

  if (req.method === "GET" && action === "loyalty-history") {
    const session = await getSession(req);
    if (!session) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    const rows = await db
      .select()
      .from(schema.loyaltyTransactions)
      .where(eq(schema.loyaltyTransactions.userId, session.userId))
      .orderBy(desc(schema.loyaltyTransactions.createdAt));
    res.status(200).json({ transactions: rows });
    return;
  }

  if (req.method === "GET") {
    const session = await getSession(req);
    if (!session) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    const [user] = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        phone: schema.users.phone,
        role: schema.users.role,
        loyaltyPoints: schema.users.loyaltyPoints,
      })
      .from(schema.users)
      .where(eq(schema.users.id, session.userId));
    if (!user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    res.status(200).json({ user });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (action === "signup") {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { name, email, password, phone } = parsed.data;
    try {
      const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
      if (existing.length > 0) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      const passwordHash = await hashPassword(password);
      const [created] = await db
        .insert(schema.users)
        .values({ name, email, passwordHash, phone, role: "user" })
        .returning({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role });

      const token = await signSession({ userId: created.id, email: created.email, role: created.role });
      setSessionCookie(res, token);
      res.status(201).json({ user: created });
    } catch (err) {
      console.error("[auth signup] failed:", err);
      res.status(500).json({ error: describeServerError(err, "Failed to create account") });
    }
    return;
  }

  if (action === "login") {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { email, password } = parsed.data;
    try {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
      if (!user || !user.isActive) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      await db.update(schema.users).set({ lastSignedIn: new Date() }).where(eq(schema.users.id, user.id));
      const token = await signSession({ userId: user.id, email: user.email, role: user.role });
      setSessionCookie(res, token);
      res.status(200).json({
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      });
    } catch (err) {
      console.error("[auth login] failed:", err);
      res.status(500).json({ error: describeServerError(err, "Failed to sign in") });
    }
    return;
  }

  if (action === "logout") {
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
    return;
  }

  if (action === "redeem-points") {
    const session = await getSession(req);
    if (!session) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    const points = Number(req.body?.points);
    if (!Number.isInteger(points) || points < MIN_REDEEM_POINTS) {
      res.status(400).json({ error: `Minimum redemption is ${MIN_REDEEM_POINTS} points` });
      return;
    }
    try {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, session.userId));
      if (!user || user.loyaltyPoints < points) {
        res.status(400).json({ error: "Not enough points" });
        return;
      }
      const value = computeRedemptionValue(points);
      const code = `LOYALTY${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const [coupon] = await db
        .insert(schema.coupons)
        .values({
          code,
          discountType: "fixed",
          value: value.toFixed(2),
          usageLimit: 1,
          isActive: true,
        })
        .returning({ code: schema.coupons.code, value: schema.coupons.value });

      await db
        .update(schema.users)
        .set({ loyaltyPoints: sql`${schema.users.loyaltyPoints} - ${points}` })
        .where(eq(schema.users.id, session.userId));

      await db.insert(schema.loyaltyTransactions).values({
        userId: session.userId,
        type: "redeem",
        points,
        note: `Redeemed for coupon ${code}`,
      });

      res.status(200).json({ coupon: coupon.code, value: Number(coupon.value) });
    } catch (err) {
      console.error("[auth redeem-points] failed:", err);
      res.status(500).json({ error: "Failed to redeem points" });
    }
    return;
  }

  if (action === "staff-create") {
    if (!(await requireSuperAdmin(req, res))) return;
    const parsed = staffCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { name, email, password, role } = parsed.data;
    try {
      const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
      if (existing.length > 0) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      const passwordHash = await hashPassword(password);
      const [created] = await db
        .insert(schema.users)
        .values({ name, email, passwordHash, role })
        .returning({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role });
      res.status(201).json({ staff: created });
    } catch (err) {
      console.error("[auth staff-create] failed:", err);
      res.status(500).json({ error: "Failed to create staff account" });
    }
    return;
  }

  if (action === "staff-update") {
    if (!(await requireSuperAdmin(req, res))) return;
    const parsed = staffUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { id, role, isActive } = parsed.data;
    try {
      await db
        .update(schema.users)
        .set({
          ...(role !== undefined && { role }),
          ...(isActive !== undefined && { isActive }),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, id));
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[auth staff-update] failed:", err);
      res.status(500).json({ error: "Failed to update staff account" });
    }
    return;
  }

  res.status(400).json({ error: "Unknown action" });
}
