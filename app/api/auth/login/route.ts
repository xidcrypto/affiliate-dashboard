import { checkOrigin } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getClientIp } from "@/lib/auth";
import { err, json, readJsonBody } from "@/lib/api";
import { log } from "@/lib/log";
import { dummyVerify, verifyPassword } from "@/lib/password";
import { checkLimit, recordFailure } from "@/lib/ratelimit";
import { createSessionValue, sessionCookieHeader } from "@/lib/session";
import { loginSchema } from "@/lib/validators";

const WINDOW_MS = 15 * 60 * 1000;
const GENERIC = "Username atau password salah";

export async function POST(req: Request) {
  try {
    if (!checkOrigin(req)) return err("Origin tidak diizinkan", 403);

    const ip = getClientIp(req);
    const ipCheck = checkLimit(`login:ip:${ip}`, 5, WINDOW_MS);
    if (!ipCheck.allowed) {
      return json({ error: "Terlalu banyak percobaan, coba lagi nanti" }, 429, {
        "Retry-After": String(ipCheck.retryAfterSec),
      });
    }

    const body = await readJsonBody(req);
    if (!body.ok) return body.res;
    const parsed = loginSchema.safeParse(body.data);
    if (!parsed.success) return err(GENERIC, 401);
    const { username, password } = parsed.data;

    const userCheck = checkLimit(`login:user:${username.toLowerCase()}`, 10, WINDOW_MS);
    if (!userCheck.allowed) {
      return json({ error: "Terlalu banyak percobaan, coba lagi nanti" }, 429, {
        "Retry-After": String(userCheck.retryAfterSec),
      });
    }

    const db = getDb();
    const row = db.prepare("SELECT username, pass_hash, token_version FROM users WHERE id = 1").get() as
      | { username: string; pass_hash: string; token_version: number }
      | undefined;

    if (!row || row.username !== username) {
      // Tetap hitung hash dummy agar timing tidak membocorkan keberadaan username.
      await dummyVerify();
      recordFailure(`login:ip:${ip}`, WINDOW_MS);
      recordFailure(`login:user:${username.toLowerCase()}`, WINDOW_MS);
      return err(GENERIC, 401);
    }

    const ok = await verifyPassword(password, row.pass_hash);
    if (!ok) {
      recordFailure(`login:ip:${ip}`, WINDOW_MS);
      recordFailure(`login:user:${username.toLowerCase()}`, WINDOW_MS);
      return err(GENERIC, 401);
    }

    const env = getEnv();
    const value = createSessionValue(1, row.token_version, env.SESSION_SECRET);
    const res = json({ ok: true, username: row.username });
    res.headers.set("Set-Cookie", sessionCookieHeader(value, true));
    log.info("Login berhasil", { user: row.username });
    return res;
  } catch (e) {
    log.error("login gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}
