import { checkOrigin } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { requireAuthFromRequest } from "@/lib/auth";
import { err, json, parseIdParam, readJsonBody } from "@/lib/api";
import { log } from "@/lib/log";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    if (!checkOrigin(req)) return err("Origin tidak diizinkan", 403);
    const id = parseIdParam(await params);
    if (!id) return err("ID tidak valid", 400);
    const db = getDb();
    const info = db
      .prepare("UPDATE schedules SET status = 'cancelled' WHERE id = ? AND status = 'scheduled'")
      .run(id);
    if (info.changes === 0) {
      const row = db.prepare("SELECT status FROM schedules WHERE id = ?").get(id) as
        | { status: string }
        | undefined;
      if (!row) return err("Jadwal tidak ditemukan", 404);
      return err("Hanya jadwal terjadwal yang bisa dibatalkan", 400);
    }
    return json({ ok: true });
  } catch (e) {
    log.error("DELETE schedule gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}

/** POST { retry: true } -> jadwalkan ulang yang gagal (buat baris baru terjadwal). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    if (!checkOrigin(req)) return err("Origin tidak diizinkan", 403);
    const id = parseIdParam(await params);
    if (!id) return err("ID tidak valid", 400);
    const body = await readJsonBody(req);
    if (!body.ok) return body.res;
    const data = body.data as Record<string, unknown>;
    if (data.retry !== true) return err("Aksi tidak dikenal", 400);
    const db = getDb();
    const row = db.prepare("SELECT * FROM schedules WHERE id = ?").get(id) as
      | { id: number; content_id: number; platforms: string; status: string }
      | undefined;
    if (!row) return err("Jadwal tidak ditemukan", 404);
    if (row.status !== "failed") return err("Hanya jadwal gagal yang bisa dicoba lagi", 400);
    // Jadwalkan ulang 2 menit dari sekarang.
    const publishAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const info = db
      .prepare("INSERT INTO schedules(content_id, platforms, publish_at) VALUES(?,?,?)")
      .run(row.content_id, row.platforms, publishAt);
    const created = db.prepare("SELECT * FROM schedules WHERE id = ?").get(info.lastInsertRowid);
    return json({ schedule: created }, 201);
  } catch (e) {
    log.error("retry schedule gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}
