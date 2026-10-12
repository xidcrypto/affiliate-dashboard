import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionEdge, SESSION_COOKIE } from "./lib/session-edge";

// Gerbang cepat di Edge runtime (Web Crypto saja, tanpa DB).
// Verifikasi penuh termasuk token_version dilakukan di requireAuth() tiap handler.
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  const secret = process.env.SESSION_SECRET || "";
  const cookie = req.cookies.get(SESSION_COOKIE)?.value ?? null;
  let authed = false;
  if (cookie && secret) {
    const payload = await verifySessionEdge(cookie, secret);
    authed = !!payload;
  }

  if (!authed) {
    if (isApi) {
      return NextResponse.json({ error: "Belum login" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|setup|api/auth|api/health|_next|favicon.ico).*)",
  ],
};
