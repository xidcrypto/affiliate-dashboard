import fs from "node:fs";
import path from "node:path";
import { requireAuthFromRequest } from "@/lib/auth";
import { err } from "@/lib/api";

const NAME_RE = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;
const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const user = requireAuthFromRequest(req);
  if (!user) return err("Belum login", 401);
  const name = (await params).name ?? "";
  if (!NAME_RE.test(name)) return err("Nama file tidak valid", 400);
  const ext = name.split(".").pop() as string;
  const full = path.join(process.cwd(), "data", "media", name);
  // Pastikan tidak ada traversal (basename check ganda).
  if (path.basename(full) !== name) return err("Nama file tidak valid", 400);
  try {
    const stat = fs.statSync(full);
    if (!stat.isFile()) return err("File tidak ditemukan", 404);
    const buf = fs.readFileSync(full);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Length": String(buf.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return err("File tidak ditemukan", 404);
  }
}
