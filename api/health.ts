import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql as dsql } from "drizzle-orm";
import { getDb, schema } from "../server-lib/db.js";
import { applyCors } from "../server-lib/utils.js";

/**
 * Health check — verifies the serverless function runs AND the Neon DB is reachable.
 * Open /api/health in the browser. No auth required (returns no sensitive data).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const report: Record<string, unknown> = {
    ok: false,
    time: new Date().toISOString(),
    env: {
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      ADMIN_TOKEN: Boolean(process.env.ADMIN_TOKEN),
      GMAIL_USER: Boolean(process.env.GMAIL_USER),
      GMAIL_APP_PASSWORD: Boolean(process.env.GMAIL_APP_PASSWORD),
    },
  };

  // If DATABASE_URL is missing, fail fast with a clear message
  if (!process.env.DATABASE_URL) {
    res.status(500).json({ ...report, db: "DATABASE_URL not set in environment" });
    return;
  }

  try {
    const db = getDb();

    // 1. Can we run a trivial query? (connection works)
    await db.execute(dsql`select 1`);

    // 2. Do the tables exist + how many products are seeded?
    let productCount: number | string = "—";
    let ordersCount: number | string = "—";
    let tablesExist = true;
    try {
      const [p] = await db
        .select({ c: dsql<number>`count(*)::int` })
        .from(schema.products);
      productCount = p?.c ?? 0;
      const [o] = await db
        .select({ c: dsql<number>`count(*)::int` })
        .from(schema.orders);
      ordersCount = o?.c ?? 0;
    } catch {
      tablesExist = false;
    }

    res.status(200).json({
      ...report,
      ok: true,
      db: "connected",
      tablesExist,
      productCount,
      ordersCount,
      hint: tablesExist
        ? productCount === 0
          ? "Tables exist but no products yet — run `pnpm db:seed`."
          : "All good — DB connected, tables exist, products seeded."
        : "Connected, but tables are missing — run `pnpm db:push` (or apply the migration SQL).",
    });
  } catch (err) {
    res.status(500).json({
      ...report,
      db: "connection failed",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
