import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../drizzle/schema.js";

/**
 * Neon serverless DB client. Uses HTTP driver — ideal for Vercel serverless
 * functions (no connection pooling/exhaustion issues).
 *
 * Set DATABASE_URL to your Neon connection string in Vercel env vars.
 */
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}

export { schema };
