/**
 * Self-hosted entry point — replaces Vercel's serverless runtime.
 *
 * Mounts the exact same `api/**` handlers as one long-lived Express process,
 * and serves the built SPA. The handlers are written against VercelRequest /
 * VercelResponse, but every method they actually use (status, json, setHeader,
 * end, query, body, headers) exists on Express with identical semantics, so
 * they run unmodified — see `adapt()` below.
 *
 * Binds to 127.0.0.1 by default: nginx terminates TLS and proxies to it.
 */
import "dotenv/config";
import express, { type Request, type Response, type RequestHandler } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeDb } from "../server-lib/db.js";

import healthHandler from "../api/health.js";
import productsHandler from "../api/products/index.js";
import ordersHandler from "../api/orders/index.js";
import authHandler from "../api/auth/index.js";
import reviewsHandler from "../api/reviews/index.js";
import abandonedCartsHandler from "../api/abandoned-carts/index.js";
import paymentIntentionHandler from "../api/payment/intention.js";
import paymentWebhookHandler from "../api/payment/webhook.js";
import adminOverviewHandler from "../api/admin/overview.js";
import adminOrdersHandler from "../api/admin/orders/index.js";
import adminCouponsHandler from "../api/admin/coupons/index.js";
import adminReviewsHandler from "../api/admin/reviews/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";
const STATIC_DIR = process.env.STATIC_DIR ?? path.resolve(__dirname, "public");

/** A Vercel-style handler. Typed loosely here; `adapt` narrows at the call site. */
type VercelStyleHandler = (req: never, res: never) => unknown | Promise<unknown>;

/**
 * Bridges an api/* handler into Express middleware.
 *
 * The cast is safe because Express's req/res are structural supersets of the
 * VercelRequest/VercelResponse surface these handlers touch. It also catches
 * rejected promises — Express 4 does not, and an unhandled one would hang the
 * request until the client gives up.
 */
function adapt(handler: VercelStyleHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req as never, res as never)).catch(next);
  };
}

const app = express();

// Behind nginx: trust exactly one proxy hop so req.ip / X-Forwarded-Proto are
// the client's, not the proxy's. `true` would let a client spoof its own IP.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// VercelRequest exposes parsed cookies. Nothing reads req.cookies today
// (server-lib/auth.ts parses the header itself), but populating it keeps the
// cast in adapt() honest if a handler starts using it.
app.use((req, _res, next) => {
  const out: Record<string, string> = {};
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  (req as Request & { cookies: Record<string, string> }).cookies = out;
  next();
});

// Mirrors the `headers` block in vercel.json.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

/* ---------------------------------------------------------------------------
 * API routes — paths match Vercel's filesystem routing 1:1, so the client
 * needs no changes.
 * ------------------------------------------------------------------------ */
const ROUTES: [string, VercelStyleHandler][] = [
  ["/api/health", healthHandler],
  ["/api/products", productsHandler],
  ["/api/orders", ordersHandler],
  ["/api/auth", authHandler],
  ["/api/reviews", reviewsHandler],
  ["/api/abandoned-carts", abandonedCartsHandler],
  ["/api/payment/intention", paymentIntentionHandler],
  ["/api/payment/webhook", paymentWebhookHandler],
  ["/api/admin/overview", adminOverviewHandler],
  ["/api/admin/orders", adminOrdersHandler],
  ["/api/admin/coupons", adminCouponsHandler],
  ["/api/admin/reviews", adminReviewsHandler],
];

for (const [route, handler] of ROUTES) {
  // `all` so each handler keeps doing its own method dispatch, exactly as it
  // did on Vercel.
  app.all(route, adapt(handler));
}

// Unknown /api/* must 404 as JSON, not fall through to the SPA shell — a
// mistyped endpoint returning index.html is a miserable thing to debug.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

/* ---------------------------------------------------------------------------
 * Static SPA
 * ------------------------------------------------------------------------ */
app.use(
  "/assets",
  express.static(path.join(STATIC_DIR, "assets"), {
    immutable: true,
    maxAge: "1y",
  })
);
app.use(express.static(STATIC_DIR, { index: false, maxAge: "1h" }));

// SPA fallback — client-side routing owns everything that is not an asset.
app.get("*", (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

// Express 4 needs the 4-arg signature to recognise this as an error handler.
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error("[unhandled]", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
  console.log(`[server] serving static from ${STATIC_DIR}`);
});

/* ---------------------------------------------------------------------------
 * Graceful shutdown — systemd sends SIGTERM on restart/deploy. Without this,
 * in-flight orders get their connection cut mid-write.
 * ------------------------------------------------------------------------ */
let shuttingDown = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] ${signal} received, draining…`);
    server.close(async () => {
      await closeDb().catch(() => {});
      process.exit(0);
    });
    // Don't let a stuck keep-alive socket block the deploy forever.
    setTimeout(() => process.exit(1), 15_000).unref();
  });
}
