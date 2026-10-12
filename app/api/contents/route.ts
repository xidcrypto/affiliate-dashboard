import { requireAuthFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { err, json } from "@/lib/api";
import { log } from "@/lib/log";

export async function GET(req: Request) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    const url = new URL(req.url);
    const productId = url.searchParams.get("product_id");
    const db = getDb();
    let rows: unknown[];
    if (productId && /^\d+$/.test(productId)) {
      rows = db
        .prepare(
          `SELECT c.*, p.name AS product_name, p.image_url AS product_image
           FROM contents c JOIN products p ON p.id = c.product_id
           WHERE c.product_id = ? ORDER BY c.id DESC LIMIT 500`
        )
        .all(Number(productId));
    } else {
      rows = db
        .prepare(
          `SELECT c.*, p.name AS product_name, p.image_url AS product_image
           FROM contents c JOIN products p ON p.id = c.product_id
           ORDER BY c.id DESC LIMIT 500`
        )
        .all();
    }
    return json({ contents: rows });
  } catch (e) {
    log.error("GET contents gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}
