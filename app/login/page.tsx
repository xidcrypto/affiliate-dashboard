import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { verifySessionSignature, SESSION_COOKIE } from "@/lib/session";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";

async function sessionValid(): Promise<boolean> {
  try {
    const env = getEnv();
    const raw = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!raw) return false;
    const p = verifySessionSignature(raw, env.SESSION_SECRET);
    if (!p) return false;
    const row = getDb().prepare("SELECT token_version FROM users WHERE id = 1").get() as
      | { token_version: number }
      | undefined;
    return !!row && row.token_version === p.tv;
  } catch {
    return false;
  }
}

function hasUser(): boolean {
  try {
    return !!getDb().prepare("SELECT id FROM users WHERE id = 1").get();
  } catch {
    return false;
  }
}

export default async function LoginPage() {
  if (!hasUser()) redirect("/setup");
  if (await sessionValid()) redirect("/");
  return (
    <div className="mesh-bg grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-center gap-6 p-12 md:flex">
        <div className="grad-accent inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-black text-white">
          A
        </div>
        <h1 className="text-4xl font-black leading-tight">
          Kelola konten affiliate <span className="grad-text">10x lebih cepat</span>
        </h1>
        <ul className="space-y-3 text-muted">
          <li className="flex gap-2"><span aria-hidden>⚡</span> AI menulis hook, caption & hashtag dalam ±15 detik</li>
          <li className="flex gap-2"><span aria-hidden>📅</span> Jadwalkan sekali, auto-post ke IG, FB & Threads</li>
          <li className="flex gap-2"><span aria-hidden>🔒</span> Aman: single-user, enkripsi sesi, anti-CSRF</li>
        </ul>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-soft sm:p-8">
          <h2 className="text-2xl font-bold">Masuk Dashboard</h2>
          <p className="mt-1 text-sm text-muted">Selamat datang kembali — kelola postinganmu hari ini.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
