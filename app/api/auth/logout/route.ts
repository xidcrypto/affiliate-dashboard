import { checkOrigin } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { requireAuthFromRequest } from "@/lib/auth";
import { clearSessionCookieHeader } from "@/lib/session";
import { err, json } from "@/lib/api";
import { log } from "@/lib/log";

export async function POST(req: Request) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    if (!checkOrigin(req)) return err("Origin tidak diizinkan", 403);
    const db = getDb();
    db.prepare("UPDATE users SET token_version = token_version + 1 WHERE id = 1").run();
    const res = json({ ok: true });
    res.headers.set("Set-Cookie", clearSessionCookieHeader(true));
    log.info("Logout", { user: user.username });
    return res;
  } catch (e) {
    log.error("logout gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}
