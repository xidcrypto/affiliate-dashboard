import { cookies, headers } from "next/headers";
import { getDb } from "./db";
import { getEnv } from "./env";
import { SESSION_COOKIE, verifySessionSignature } from "./session";

export interface AuthUser {
  uid: number;
  username: string;
  tokenVersion: number;
}

export function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx < 0) continue;
    const k = p.slice(0, idx).trim();
    if (k === name) return p.slice(idx + 1).trim();
  }
  return null;
}

async function readSessionFromCookies(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(SESSION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

/** Verifikasi penuh di Node runtime: signature + exp + token_version dari DB. */
export async function requireAuthFromCookies(): Promise<AuthUser | null> {
  let env;
  try {
    env = getEnv();
  } catch {
    return null;
  }
  const raw = await readSessionFromCookies();
  if (!raw) return null;
  const payload = verifySessionSignature(raw, env.SESSION_SECRET);
  if (!payload || payload.uid !== 1) return null;
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT username, token_version FROM users WHERE id = 1")
      .get() as { username: string; token_version: number } | undefined;
    if (!row) return null;
    if (row.token_version !== payload.tv) return null;
    return { uid: 1, username: row.username, tokenVersion: row.token_version };
  } catch {
    return null;
  }
}

/** Versi untuk Route Handler yang menerima Request (baca header cookie langsung). */
export function requireAuthFromRequest(req: Request): AuthUser | null {
  let env;
  try {
    env = getEnv();
  } catch {
    return null;
  }
  const raw = getCookieValue(req.headers.get("cookie"), SESSION_COOKIE);
  if (!raw) return null;
  const payload = verifySessionSignature(raw, env.SESSION_SECRET);
  if (!payload || payload.uid !== 1) return null;
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT username, token_version FROM users WHERE id = 1")
      .get() as { username: string; token_version: number } | undefined;
    if (!row) return null;
    if (row.token_version !== payload.tv) return null;
    return { uid: 1, username: row.username, tokenVersion: row.token_version };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser | null> {
  return await requireAuthFromCookies();
}

export function hasAnyUser(): boolean {
  try {
    const db = getDb();
    const row = db.prepare("SELECT id FROM users WHERE id = 1").get() as
      | { id: number }
      | undefined;
    return !!row;
  } catch {
    return false;
  }
}

export function getClientIp(req: Request): string {
  let envTrust = true;
  try {
    envTrust = getEnv().TRUST_PROXY;
  } catch {
    envTrust = false;
  }
  if (envTrust) {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
      const first = xff.split(",")[0]?.trim();
      if (first) return first.slice(0, 100);
    }
  }
  // Next standalone tidak memberi remoteAddr di Request; fallback header lain.
  const real = req.headers.get("x-real-ip");
  if (real) return real.slice(0, 100);
  return "unknown";
}

export function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0]?.trim() === "https";
  try {
    const url = new URL(req.url);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function currentUsername(): Promise<string | null> {
  return (await requireAuthFromCookies())?.username ?? null;
}

export async function headerUsername(): Promise<string> {
  try {
    return (await headers()).get("x-username") ?? "";
  } catch {
    return "";
  }
}
