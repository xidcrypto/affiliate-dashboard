import { checkOrigin } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { requireAuthFromRequest } from "@/lib/auth";
import { err, json, parseIdParam, readJsonBody } from "@/lib/api";
import { log } from "@/lib/log";
import { productUpdateSchema } from "@/lib/validators";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    const id = parseIdParam(await params);
    if (!id) return err("ID tidak valid", 400);
    const db = getDb();
    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!row) return err("Produk tidak ditemukan", 404);
    return json({ product: row });
  } catch (e) {
    log.error("GET product gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    if (!checkOrigin(req)) return err("Origin tidak diizinkan", 403);
    const id = parseIdParam(await params);
    if (!id) return err("ID tidak valid", 400);
    const body = await readJsonBody(req);
    if (!body.ok) return body.res;
    const parsed = productUpdateSchema.safeParse(body.data);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message || "Data tidak valid", 400);
    }
    const db = getDb();
    const exists = db.prepare("SELECT id FROM products WHERE id = ?").get(id);
    if (!exists) return err("Produk tidak ditemukan", 404);
    const p = parsed.data;
    const fields: string[] = [];
    const vals: unknown[] = [];
    for (const k of ["name", "url", "price", "original_price", "image_url", "rating", "sold_count", "affiliate_link"] as const) {
      if (p[k] !== undefined) {
        fields.push(`${k} = ?`);
        vals.push(p[k] || null);
      }
    }
    if (!fields.length) return err("Tidak ada field untuk diubah", 400);
    vals.push(id);
    db.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(...vals);
    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    return json({ product: row });
  } catch (e) {
    log.error("PUT product gagal");
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
    const info = db.prepare("DELETE FROM products WHERE id = ?").run(id);
    if (info.changes === 0) return err("Produk tidak ditemukan", 404);
    return json({ ok: true });
  } catch (e) {
    log.error("DELETE product gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}
