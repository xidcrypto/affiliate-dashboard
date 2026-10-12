import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "__Host-aff_sess";
const SESSION_DAYS = 7;

export function b64urlEncode(input: string | Buffer): string {
  const b = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return b.toString("base64url");
}

export function b64urlDecodeToString(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

export interface SessionPayload {
  uid: number;
  exp: number;
  tv: number;
}

export function signPayload(payloadB64: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(payloadB64).digest();
  return b64urlEncode(sig);
}

export function createSessionValue(uid: number, tokenVersion: number, secret: string): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  const payload: SessionPayload = { uid, exp, tv: tokenVersion };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const sig = signPayload(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export function verifySessionSignature(
  cookieValue: string,
  secret: string
): SessionPayload | null {
  const dot = cookieValue.indexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = cookieValue.slice(0, dot);
  const sigB64 = cookieValue.slice(dot + 1);
  if (!payloadB64 || !sigB64) return null;
  let expected: Buffer;
  let actual: Buffer;
  try {
    expected = Buffer.from(signPayload(payloadB64, secret), "utf8");
    actual = Buffer.from(sigB64, "utf8");
  } catch {
    return null;
  }
  if (expected.length !== actual.length) return null;
  try {
    if (!timingSafeEqual(expected, actual)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(b64urlDecodeToString(payloadB64)) as SessionPayload;
    if (typeof payload.uid !== "number" || typeof payload.exp !== "number" || typeof payload.tv !== "number")
      return null;
    if (payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieHeader(value: string, secure: boolean): string {
  // __Host- requires Secure + Path=/ + no Domain. Di http localhost, Secure cookie
  // tetap bisa diset dari localhost (browser mengizinkan Secure di localhost).
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=604800",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookieHeader(secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** Verifikasi cepat untuk Edge middleware memakai Web Crypto (tanpa DB). */
export async function verifySessionEdge(
  cookieValue: string,
  secret: string
): Promise<SessionPayload | null> {
  const dot = cookieValue.indexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = cookieValue.slice(0, dot);
  const sigB64 = cookieValue.slice(dot + 1);
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = base64urlToBytes(sigB64);
    const data = new TextEncoder().encode(payloadB64);
    const ok = await crypto.subtle.verify("HMAC", key, sigBytes as BufferSource, data);
    if (!ok) return null;
    const json = JSON.parse(base64urlToUtf8(payloadB64)) as SessionPayload;
    if (typeof json.exp !== "number" || json.exp <= Date.now()) return null;
    if (typeof json.uid !== "number" || typeof json.tv !== "number") return null;
    return json;
  } catch {
    return null;
  }
}

function base64urlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function base64urlToUtf8(s: string): string {
  const bytes = base64urlToBytes(s);
  return new TextDecoder().decode(bytes);
}
