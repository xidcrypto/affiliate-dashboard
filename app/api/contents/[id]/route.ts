import { checkOrigin } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { requireAuthFromRequest } from "@/lib/auth";
import { err, json, parseIdParam, readJsonBody } from "@/lib/api";
import { log } from "@/lib/log";
import { contentUpdateSchema } from "@/lib/validators";
import { fixHashtags, cleanText, truncate } from "@/lib/sanitize";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    if (!checkOrigin(req)) return err("Origin tidak diizinkan", 403);
    const id = parseIdParam(await params);
    if (!id) return err("ID tidak valid", 400);
    const body = await readJsonBody(req);
    if (!body.ok) return body.res;
    const parsed = contentUpdateSchema.safeParse(body.data);
    if (!parsed.success) return err("Data tidak valid", 400);
    const db = getDb();
    const exists = db.prepare("SELECT id FROM contents WHERE id = ?").get(id);
    if (!exists) return err("Konten tidak ditemukan", 404);
    const c = parsed.data;
    const fields: string[] = [];
    const vals: unknown[] = [];
    if (c.hook !== undefined) {
      fields.push("hook = ?");
      vals.push(truncate(cleanText(c.hook), 150));
    }
    if (c.caption !== undefined) {
      fields.push("caption = ?");
      vals.push(truncate(cleanText(c.caption), 2000));
    }
    if (c.hashtags !== undefined) {
      fields.push("hashtags = ?");
      vals.push(truncate(fixHashtags(c.hashtags), 500));
    }
    if (c.cta !== undefined) {
      fields.push("cta = ?");
      vals.push(truncate(cleanText(c.cta), 500));
    }
    if (c.status !== undefined) {
      fields.push("status = ?");
      vals.push(c.status);
    }
    if (!fields.length) return err("Tidak ada field untuk diubah", 400);
    vals.push(id);
    db.prepare(`UPDATE contents SET ${fields.join(", ")} WHERE id = ?`).run(...vals);
    const row = db.prepare("SELECT * FROM contents WHERE id = ?").get(id);
    return json({ content: row });
  } catch (e) {
    log.error("PUT content gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    if (!checkOrigin(req)) return err("Origin tidak diizinkan", 403);
    const id = parseIdParam(await params);
    if (!id) return err("ID tidak valid", 400);
    const db = getDb();
    const info = db.prepare("DELETE FROM contents WHERE id = ?").run(id);
    if (info.changes === 0) return err("Konten tidak ditemukan", 404);
    return json({ ok: true });
  } catch (e) {
    log.error("DELETE content gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}
