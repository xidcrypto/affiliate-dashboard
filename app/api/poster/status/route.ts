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
      const res = await fetchWithTimeout(`${env.SOCIAL_POSTER_URL.replace(/\/$/, "")}/api/status`, {
        timeoutMs: 30000,
        headers: { "x-api-key": env.SOCIAL_POSTER_KEY },
      });
      const text = await res.text();
      let data: unknown = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text.slice(0, 500) };
      }
      return json({ status: data });
    } catch (e) {
      log.error("poster status gagal");
      void e;
      return json({ status: null, error: `Tidak dapat menghubungi social-poster (${errorMessage(e)})` });
    }
  } catch (e) {
    log.error("GET poster status gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}
