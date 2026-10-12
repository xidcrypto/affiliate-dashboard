import { getEnv } from "./env";

/** Cek Origin/Host untuk method mutasi (anti-CSRF). Return true bila lolos. */
export function checkOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  let allowed = "";
  try {
    allowed = getEnv().ALLOWED_ORIGIN || "";
  } catch {
    return false;
  }
  const origin = req.headers.get("origin");
  const host = req.headers.get("host") || "";
  let reqUrl: URL | null = null;
  try {
    reqUrl = new URL(req.url);
  } catch {
    return false;
  }
  // Tanpa Origin (mis. curl/server-to-server) -> bandingkan Host dengan host request.
  if (!origin) {
    if (!allowed) return true; // belum dikonfigurasi: izinkan bila host lokal? ketat: tolak bila host asing?
    try {
      const a = new URL(allowed);
      // Izinkan bila host request sama dengan host ALLOWED_ORIGIN atau host lokal request itu sendiri.
      if (a.host === host) return true;
      // Fallback: izinkan bila host == origin request sendiri (same-host tanpa Origin header).
      return host === reqUrl.host;
    } catch {
      return host === reqUrl.host;
    }
  }
  try {
    const o = new URL(origin);
    // 1) sama dengan ALLOWED_ORIGIN
    if (allowed) {
      try {
        const a = new URL(allowed);
        if (o.origin === a.origin) return true;
      } catch {
        /* abaikan */
      }
    }
    // 2) same-origin dengan host request
    const hostProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || reqUrl.protocol.replace(":", "");
    if (o.host === host || o.host === reqUrl.host) {
      // skema boleh http di localhost
      void hostProto;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
