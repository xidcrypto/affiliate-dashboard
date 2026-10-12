import { timingSafeEqual } from "node:crypto";
import { checkOrigin } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getClientIp, hasAnyUser, isSecureRequest } from "@/lib/auth";
import { err, json, readJsonBody } from "@/lib/api";
import { log } from "@/lib/log";
import { hashPassword } from "@/lib/password";
import { checkLimit, recordFailure } from "@/lib/ratelimit";
import { createSessionValue, sessionCookieHeader } from "@/lib/session";
import { passwordPolicy, setupSchema } from "@/lib/validators";

const WINDOW_MS = 15 * 60 * 1000;

function tokenEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/** GET: cek apakah setup dibutuhkan. 404 bila user sudah ada. */
export async function GET() {
  try {
    if (hasAnyUser()) return err("Tidak ditemukan", 404);
    return json({ setupNeeded: true });
  } catch (e) {
    log.error("setup GET gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}

export async function POST(req: Request) {
  try {
    // Setelah user ada -> 404 (jangan bocorkan keberadaan akun selain 404).
    if (hasAnyUser()) return err("Tidak ditemukan", 404);
    if (!checkOrigin(req)) return err("Origin tidak diizinkan", 403);

    const ip = getClientIp(req);
    const rl = checkLimit(`setup:${ip}`, 5, WINDOW_MS);
    if (!rl.allowed) {
      return json(
        { error: "Terlalu banyak percobaan, coba lagi nanti" },
        429,
        { "Retry-After": String(rl.retryAfterSec) }
      );
    }

    const body = await readJsonBody(req);
    if (!body.ok) return body.res;
    const parsed = setupSchema.safeParse(body.data);
    if (!parsed.success) {
      recordFailure(`setup:${ip}`, WINDOW_MS);
      return err("Data tidak valid", 400);
    }
    const { setup_token, username, password, confirm_password } = parsed.data;

    const env = getEnv();
    if (!env.SETUP_TOKEN || !tokenEqual(setup_token, env.SETUP_TOKEN)) {
      recordFailure(`setup:${ip}`, WINDOW_MS);
      return err("Token setup salah", 403);
    }
    if (password !== confirm_password) {
      recordFailure(`setup:${ip}`, WINDOW_MS);
      return err("Konfirmasi password tidak cocok", 400);
    }
    const policy = passwordPolicy(password, username);
    if (policy) {
      recordFailure(`setup:${ip}`, WINDOW_MS);
      return err(policy, 400);
    }

    const passHash = await hashPassword(password);
    const db = getDb();
    try {
      // Race-safe: INSERT id=1 dalam transaksi; bila sudah ada -> 404.
      const txn = db.transaction(() => {
        const exists = db.prepare("SELECT id FROM users WHERE id = 1").get() as
          | { id: number }
          | undefined;
        if (exists) throw new Error("ALREADY_EXISTS");
        db.prepare("INSERT INTO users(id, username, pass_hash, token_version) VALUES(1, ?, ?, 0)").run(
          username,
          passHash
        );
      });
      txn();
    } catch (e) {
      if (e instanceof Error && e.message === "ALREADY_EXISTS") {
        return err("Tidak ditemukan", 404);
      }
      throw e;
    }

    const value = createSessionValue(1, 0, env.SESSION_SECRET);
    // __Host- wajib Secure; browser mengizinkan Secure di localhost/HTTPS.
    const res = json({ ok: true, username });
    res.headers.set("Set-Cookie", sessionCookieHeader(value, true));
    void isSecureRequest;
    log.info("Akun awal dibuat", { user: username });
    return res;
  } catch (e) {
    log.error("setup POST gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}
