import { checkOrigin } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getClientIp, requireAuthFromRequest } from "@/lib/auth";
import { err, json, readJsonBody } from "@/lib/api";
import { log } from "@/lib/log";
import { hashPassword, verifyPassword } from "@/lib/password";
import { checkLimit, recordFailure } from "@/lib/ratelimit";
import { createSessionValue, sessionCookieHeader } from "@/lib/session";
import { changePasswordSchema, passwordPolicy } from "@/lib/validators";

const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    if (!checkOrigin(req)) return err("Origin tidak diizinkan", 403);

    const ip = getClientIp(req);
    const rl = checkLimit(`chpass:${ip}`, 5, WINDOW_MS);
    if (!rl.allowed) {
      return json({ error: "Terlalu banyak percobaan, coba lagi nanti" }, 429, {
        "Retry-After": String(rl.retryAfterSec),
      });
    }

    const body = await readJsonBody(req);
    if (!body.ok) return body.res;
    const parsed = changePasswordSchema.safeParse(body.data);
    if (!parsed.success) {
      recordFailure(`chpass:${ip}`, WINDOW_MS);
      return err("Data tidak valid", 400);
    }
    const { old_password, new_password } = parsed.data;

    const db = getDb();
    const row = db.prepare("SELECT username, pass_hash, token_version FROM users WHERE id = 1").get() as
      | { username: string; pass_hash: string; token_version: number }
      | undefined;
    if (!row) return err("Belum login", 401);

    const okOld = await verifyPassword(old_password, row.pass_hash);
    if (!okOld) {
      recordFailure(`chpass:${ip}`, WINDOW_MS);
      return err("Password lama salah", 400);
    }
    const policy = passwordPolicy(new_password, row.username);
    if (policy) {
      recordFailure(`chpass:${ip}`, WINDOW_MS);
      return err(policy, 400);
    }

    const newHash = await hashPassword(new_password);
    db.prepare("UPDATE users SET pass_hash = ?, token_version = token_version + 1 WHERE id = 1").run(newHash);
    const updated = db.prepare("SELECT token_version FROM users WHERE id = 1").get() as {
      token_version: number;
    };

    const env = getEnv();
    const value = createSessionValue(1, updated.token_version, env.SESSION_SECRET);
    const res = json({ ok: true });
    res.headers.set("Set-Cookie", sessionCookieHeader(value, true));
    log.info("Password diganti");
    return res;
  } catch (e) {
    log.error("change-password gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}
