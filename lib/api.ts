import { NextResponse } from "next/server";

const MAX_BODY = 1024 * 1024; // 1 MB

export function json(data: unknown, status = 200, headers?: Record<string, string>): NextResponse {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store");
  if (headers) {
    for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  }
  return res;
}

export function err(message: string, status = 400): NextResponse {
  return json({ error: message }, status);
}

export async function readJsonBody(req: Request): Promise<{ ok: true; data: unknown } | { ok: false; res: NextResponse }> {
  const len = req.headers.get("content-length");
  if (len && Number(len) > MAX_BODY) {
    return { ok: false, res: err("Body terlalu besar (maks 1 MB)", 413) };
  }
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, res: err("Gagal membaca body", 400) };
  }
  if (text.length > MAX_BODY) {
    return { ok: false, res: err("Body terlalu besar (maks 1 MB)", 413) };
  }
  if (!text) return { ok: true, data: {} };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, res: err("Body bukan JSON valid", 400) };
  }
}

export function parseIdParam(params: { id?: string }): number | null {
  const n = Number(params.id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}
