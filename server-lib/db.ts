import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../drizzle/schema.js";

/**
 * Postgres client (self-hosted — e.g. Oracle Cloud VM).
 *
 * Uses the node-postgres TCP driver. Each serverless instance keeps its own
 * pool, so `max` is deliberately tiny — the real pooling happens in PgBouncer
 * on the DB host. Raising `max` here multiplies by the number of warm Vercel
 * instances and will exhaust `max_connections` on the server.
 *
 * Env vars:
 *   DATABASE_URL  postgresql://user:pass@host:6432/db
 *   DATABASE_SSL  "require" (default) | "verify-full" | "disable"
 *   DATABASE_CA   server CA in PEM form — required when DATABASE_SSL=verify-full
 *   DATABASE_POOL_MAX  connections per instance (default 1)
 */
let _db: ReturnType<typeof drizzle> | null = null;
let _pool: pg.Pool | null = null;

function buildSsl(): pg.PoolConfig["ssl"] {
  // Mirrors libpq sslmode semantics: "require" encrypts but does not verify
  // the chain, "verify-full" does both and needs DATABASE_CA.
  const mode = (process.env.DATABASE_SSL ?? "require").toLowerCase();
  if (mode === "disable") return false;
  if (mode === "verify-full") {
    const ca = process.env.DATABASE_CA;
    if (!ca) {
      throw new Error("DATABASE_SSL=verify-full requires DATABASE_CA (server CA in PEM form)");
    }
    return { ca, rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
}

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  _pool = new pg.Pool({
    connectionString: url,
    ssl: buildSsl(),
    max: Number(process.env.DATABASE_POOL_MAX ?? 1),
    // Fail fast when the VM is unreachable instead of hanging until the
    // function times out.
    connectionTimeoutMillis: 10_000,
    // Release sockets well before Vercel freezes the instance.
    idleTimeoutMillis: 10_000,
    // Kill runaway queries rather than holding the single pooled connection.
    statement_timeout: 20_000,
    query_timeout: 20_000,
    keepAlive: true,
  });

  // A pool error on an idle client is emitted on the pool, not a query — an
  // unhandled one crashes the process.
  _pool.on("error", (err) => {
    console.error("[db] idle client error:", err.message);
  });

  _db = drizzle(_pool, { schema });
  return _db;
}

/** Closes the pool. Only useful for scripts/tests — not for serverless handlers. */
export async function closeDb() {
  await _pool?.end();
  _pool = null;
  _db = null;
}

export { schema };
