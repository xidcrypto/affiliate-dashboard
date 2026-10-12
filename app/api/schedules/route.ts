import { checkOrigin } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { requireAuthFromRequest } from "@/lib/auth";
import { err, json, readJsonBody } from "@/lib/api";
import { log } from "@/lib/log";
import { scheduleCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "all";
    const db = getDb();
    let rows: unknown[];
    if (["scheduled", "processing", "sent", "failed", "cancelled"].includes(status)) {
      rows = db
        .prepare(
          `SELECT s.*, c.hook, c.caption, c.hashtags, c.media_path, p.name AS product_name, p.affiliate_link
           FROM schedules s JOIN contents c ON c.id = s.content_id JOIN products p ON p.id = c.product_id
           WHERE s.status = ? ORDER BY s.publish_at ASC LIMIT 500`
        )
        .all(status);
    } else {
      rows = db
        .prepare(
          `SELECT s.*, c.hook, c.caption, c.hashtags, c.media_path, p.name AS product_name, p.affiliate_link
           FROM schedules s JOIN contents c ON c.id = s.content_id JOIN products p ON p.id = c.product_id
           ORDER BY s.publish_at ASC LIMIT 500`
        )
        .all();
    }
    return json({ schedules: rows });
  } catch (e) {
    log.error("GET schedules gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}

export async function POST(req: Request) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    if (!checkOrigin(req)) return err("Origin tidak diizinkan", 403);
    const body = await readJsonBody(req);
    if (!body.ok) return body.res;
    // Terima publish_at dari datetime-local WIB juga: konversi bila perlu.
    const raw = body.data as Record<string, unknown>;
    let publishAt = raw.publish_at as string;
    if (typeof publishAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(publishAt)) {
      // Asumsikan WIB (UTC+7).
      const m = publishAt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
      if (m) {
        const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]) - 7, Number(m[5]));
        publishAt = new Date(utc).toISOString();
      }
    }
    const parsed = scheduleCreateSchema.safeParse({
      content_id: raw.content_id,
      platforms: raw.platforms,
      publish_at: publishAt,
    });
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message || "Data tidak valid", 400);
    }
    const db = getDb();
    const content = db.prepare("SELECT id FROM contents WHERE id = ?").get(parsed.data.content_id);
    if (!content) return err("Konten tidak ditemukan", 404);
    // Normalisasi publish_at ke ISO UTC.
    const iso = new Date(parsed.data.publish_at).toISOString();
    const info = db
      .prepare("INSERT INTO schedules(content_id, platforms, publish_at) VALUES(?,?,?)")
      .run(parsed.data.content_id, JSON.stringify(parsed.data.platforms), iso);
    const row = db.prepare("SELECT * FROM schedules WHERE id = ?").get(info.lastInsertRowid);
    return json({ schedule: row }, 201);
  } catch (e) {
    log.error("POST schedules gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}
