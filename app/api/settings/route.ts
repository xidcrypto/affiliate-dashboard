import { checkOrigin } from "@/lib/csrf";
import { requireAuthFromRequest } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { err, json, readJsonBody } from "@/lib/api";
import { log } from "@/lib/log";
import { keyStatus } from "@/lib/redact";
import { getSettingsMap, setSetting } from "@/lib/settings";
import { settingsSaveSchema } from "@/lib/validators";

export async function GET(req: Request) {
  try {
    const user = requireAuthFromRequest(req);
    if (!user) return err("Belum login", 401);
    let env;
    try {
      env = getEnv();
    } catch {
      return err("Konfigurasi server belum lengkap", 500);
    }
    const map = getSettingsMap();
    const poster = keyStatus(env.SOCIAL_POSTER_KEY);
    const llm = keyStatus(env.LLM_URL ? "x" : "");
    return json({
      settings: {
        FB_PAGE_ID: map.FB_PAGE_ID ?? env.FB_PAGE_ID ?? "",
        disclosure_text: map.disclosure_text ?? "#affiliate",
        theme: map.theme ?? "dark",
      },
      keys: {
        social_poster: { installed: poster.installed, tail: poster.tail },
        llm: { installed: !!env.LLM_URL, tail: llm.tail ? undefined : undefined },
        llm_url: env.LLM_URL ? true : false,
      },
    });
  } catch (e) {
    log.error("GET settings gagal");
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
    const parsed = settingsSaveSchema.safeParse(body.data);
    if (!parsed.success) return err("Data tidak valid", 400);
    const s = parsed.data;
    if (s.FB_PAGE_ID !== undefined) setSetting("FB_PAGE_ID", s.FB_PAGE_ID.slice(0, 100));
    if (s.disclosure_text !== undefined) setSetting("disclosure_text", s.disclosure_text.slice(0, 100));
    if (s.theme !== undefined) setSetting("theme", s.theme);
    return json({ ok: true });
  } catch (e) {
    log.error("POST settings gagal");
    void e;
    return err("Terjadi kesalahan", 500);
  }
}
