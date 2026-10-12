import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { SetupForm } from "./form";

export const dynamic = "force-dynamic";

function hasUser(): boolean {
  try {
    return !!getDb().prepare("SELECT id FROM users WHERE id = 1").get();
  } catch {
    return false;
  }
}

export default function SetupPage() {
  if (hasUser()) notFound();
  return (
    <div className="mesh-bg grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-center gap-6 p-12 md:flex">
        <div className="grad-accent inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-black text-white">
          A
        </div>
        <h1 className="text-4xl font-black leading-tight">
          Siapkan akun <span className="grad-text">dalam 1 menit</span>
        </h1>
        <ul className="space-y-3 text-muted">
          <li className="flex gap-2"><span aria-hidden>🔑</span> Gunakan token setup dari file .env server</li>
          <li className="flex gap-2"><span aria-hidden>🛡️</span> Password minimal 10 karakter, tersimpan sebagai hash scrypt</li>
          <li className="flex gap-2"><span aria-hidden>⚠️</span> Setelah akun dibuat, halaman ini dinonaktifkan permanen</li>
        </ul>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-soft sm:p-8">
          <h2 className="text-2xl font-bold">Buat Akun Admin</h2>
          <p className="mt-1 text-sm text-muted">Hanya bisa dilakukan sekali saat pertama install.</p>
          <div className="mt-6">
            <SetupForm />
          </div>
        </div>
      </div>
    </div>
  );
}
