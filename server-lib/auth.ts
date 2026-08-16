import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { SignJWT, jwtVerify } from "jose";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const scrypt = promisify(scryptCb);

const KEYLEN = 64;
const SESSION_COOKIE = "momo_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/* ---------- Password hashing (Node's built-in scrypt, no extra deps) ---------- */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
  const storedBuf = Buffer.from(hashHex, "hex");
  if (storedBuf.length !== derived.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

/* ---------- JWT session (jose, HS256) ---------- */

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required to sign/verify sessions");
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: number;
  email: string;
  role: "user" | "support" | "manager" | "super_admin";
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId === "number" &&
      typeof payload.email === "string" &&
      typeof payload.role === "string"
    ) {
      return payload as unknown as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/* ---------- Cookie helpers ---------- */

function parseCookies(req: VercelRequest): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

export function getSessionTokenFromRequest(req: VercelRequest): string | null {
  return parseCookies(req)[SESSION_COOKIE] || null;
}

export function setSessionCookie(res: VercelResponse, token: string): void {
  const isProd = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  if (isProd) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

/**
 * Reads + verifies the session cookie from a request.
 * Returns the payload, or null if missing/invalid/expired.
 */
export async function getSession(req: VercelRequest): Promise<SessionPayload | null> {
  const token = getSessionTokenFromRequest(req);
  if (!token) return null;
  return verifySession(token);
}

/** Require a logged-in customer/staff session; sends 401 and returns null if absent. */
export async function requireSession(req: VercelRequest, res: VercelResponse): Promise<SessionPayload | null> {
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ error: "Not signed in" });
    return null;
  }
  return session;
}

/** Require staff-level access (support/manager/super_admin). */
export async function requireStaff(req: VercelRequest, res: VercelResponse): Promise<SessionPayload | null> {
  const session = await getSession(req);
  if (!session || session.role === "user") {
    res.status(403).json({ error: "Staff access required" });
    return null;
  }
  return session;
}
