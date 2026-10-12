import { checkOrigin } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { requireAuthFromRequest } from "@/lib/auth";
import { err, json, readJsonBody } from "@/lib/api";
import { log } from "@/lib/log";
import { productCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
    const sort = url.searchParams.get("sort") || "newest";
    const db = getDb();
    let rows: unknown[];
    if (q) {
      rows = db
        .prepare(
          "SELECT * FROM products WHERE name LIKE ? ORDER BY id DESC LIMIT 500"
        )
        .all(`%${q.replace(/[%_]/g, "")}%`);
    } else {
      rows = db.prepare("SELECT * FROM products ORDER BY id DESC LIMIT 500").all();
    }
    // Hitung jumlah konten per produk.
    const counts = db
      .prepare("SELECT product_id, COUNT(*) c FROM contents GROUP BY product_id")
      .all() as { product_id: number; c: number }[];
    const map = new Map(counts.map((c) => [c.product_id, c.c]));
    const products = (rows as Record<string, unknown>[]).map((p) => ({
      ...p,
      content_count: map.get(p.id as number) ?? 0,
    }));
    if (sort === "name") {
      products.sort((a, b) =>
        String((a as Record<string, unknown>).name).localeCompare(
          String((b as Record<string, unknown>).name),
          "id"
        )
      );
    }
    return json({ products });
  } catch (e) {
    log.error("GET products gagal");
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
    const parsed = productCreateSchema.safeParse(body.data);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Data tidak valid";
      return err(msg, 400);
    }
    const p = parsed.data;
    const db = getDb();
    const info = db
      .prepare(
        "INSERT INTO products(name, url, price, original_price, image_url, rating, sold_count, affiliate_link) VALUES(?,?,?,?,?,?,?,?)"
      )
      .run(
        p.name,
        p.url || null,
        p.price || null,
        p.original_price || null,
        p.image_url || null,
        p.rating || null,
        p.sold_count || null,
        p.affiliate_link
      );
    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid);
    return json({ product: row }, 201);
  } catch (e) {
    log.error("POST products gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}
