"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

function strength(pw: string): { label: string; width: string; color: string } {
  let s = 0;
  if (pw.length >= 10) s++;
  if (pw.length >= 14) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { label: "Lemah", width: "20%", color: "bg-danger" };
  if (s <= 3) return { label: "Sedang", width: "55%", color: "bg-warning" };
  return { label: "Kuat", width: "100%", color: "bg-success" };
}

export function SetupForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const st = strength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setup_token: token, username, password, confirm_password: confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Gagal membuat akun");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung, coba lagi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Token setup (dari .env server)">
        <Input value={token} onChange={(e) => setToken(e.target.value)} required autoComplete="off" placeholder="token sekali pakai" />
      </Field>
      <Field label="Username">
        <Input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} autoComplete="username" placeholder="admin" />
      </Field>
      <Field label="Password (min 10 karakter)">
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={10}
            autoComplete="new-password"
            placeholder="••••••••••"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-fg"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {password && (
          <div className="mt-2" aria-live="polite">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
              <div className={`h-full ${st.color}`} style={{ width: st.width }} />
            </div>
            <p className="mt-1 text-xs text-muted">Kekuatan: {st.label}</p>
          </div>
        )}
      </Field>
      <Field label="Konfirmasi password">
        <Input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" placeholder="••••••••••" />
      </Field>
      {error && (
        <p role="alert" className="rounded-[12px] border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" loading={loading} className="w-full">
        Buat akun & masuk
      </Button>
    </form>
  );
}
