import { requireAuthFromRequest } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { err, json } from "@/lib/api";
import { fetchWithTimeout, errorMessage } from "@/lib/http";
import { log } from "@/lib/log";

export async function GET(req: Request) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    const env = getEnv();
    try {
      const res = await fetchWithTimeout(`${env.SOCIAL_POSTER_URL.replace(/\/$/, "")}/api/queue`, {
        timeoutMs: 30000,
        headers: { "x-api-key": env.SOCIAL_POSTER_KEY },
      });
      const text = await res.text();
      let data: unknown = null;
      try {
        data = JSON.parse(text);
      } catch {
        return json({ queue: [], error: "Respons antrean tidak valid" });
      }
      // Ringkas: hanya id, text 80 char, platforms, status, publish_at.
      const list = Array.isArray(data) ? data : (data as Record<string, unknown>).queue ?? (data as Record<string, unknown>).items ?? [];
      const arr = Array.isArray(list) ? list : [];
      const queue = arr.slice(0, 200).map((j: unknown) => {
        const o = j as Record<string, unknown>;
        const text = typeof o.text === "string" ? o.text : typeof o.caption === "string" ? o.caption : "";
        return {
          id: o.id ?? o.job_id ?? null,
          text: String(text).slice(0, 80),
          platforms: o.platforms ?? o.platform ?? null,
          status: o.status ?? null,
          publish_at: o.publish_at ?? o.scheduled_at ?? o.created_at ?? null,
        };
      });
      return json({ queue });
    } catch (e) {
      log.error("poster queue gagal");
      void e;
      return json({ queue: [], error: `Tidak dapat menghubungi social-poster (${errorMessage(e)})` });
    }
  } catch (e) {
    log.error("GET poster queue gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}
