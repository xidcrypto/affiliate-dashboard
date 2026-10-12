// Versi ringan TANPA import node:crypto — aman untuk Edge runtime (middleware).
// Jangan import file ini dari kode Node yang butuh sign/verify sync; pakai lib/session.ts.

export const SESSION_COOKIE = "__Host-aff_sess";

export interface SessionPayload {
  uid: number;
  exp: number;
  tv: number;
}

function b64urlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Verifikasi cepat HMAC-SHA256 + exp memakai Web Crypto (tanpa cek DB). */
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
    const sigBytes = b64urlToBytes(sigB64);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as BufferSource,
      new TextEncoder().encode(payloadB64)
    );
    if (!ok) return null;
    const json = JSON.parse(
      new TextDecoder().decode(b64urlToBytes(payloadB64))
    ) as SessionPayload;
    if (typeof json.exp !== "number" || json.exp <= Date.now()) return null;
    if (typeof json.uid !== "number" || typeof json.tv !== "number") return null;
    return json;
  } catch {
    return null;
  }
}
