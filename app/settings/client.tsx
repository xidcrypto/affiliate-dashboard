"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export function SettingsClient({ username }: { username: string }) {
  const { toast } = useToast();
  const [fbPage, setFbPage] = useState("");
  const [disclosure, setDisclosure] = useState("#affiliate");
  const [keys, setKeys] = useState<{ social_poster?: { installed: boolean; tail: string } }>({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  // Ganti password
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.settings) {
          setFbPage(j.settings.FB_PAGE_ID ?? "");
          setDisclosure(j.settings.disclosure_text ?? "#affiliate");
        }
        if (j.keys) setKeys(j.keys);
      })
      .catch(() => {});
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ FB_PAGE_ID: fbPage, disclosure_text: disclosure }),
      });
      if (!res.ok) toast("Gagal menyimpan", "error");
      else toast("Pengaturan disimpan", "success");
    } catch {
      toast("Tidak dapat terhubung", "error");
    } finally {
      setSaving(false);
    }
  };

  const testConn = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/poster/status");
      const data = await res.json();
      if (data.status) toast("Koneksi social-poster OK", "success");
      else toast(data.error || "Social-poster tidak terjangkau", "error");
    } catch {
      toast("Tidak dapat terhubung", "error");
    } finally {
      setTesting(false);
    }
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast(data.error || "Gagal ganti password", "error");
      else {
        toast("Password diganti — sesi lain otomatis keluar", "success");
        setOldPw("");
        setNewPw("");
      }
    } catch {
      toast("Tidak dapat terhubung", "error");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="font-bold">Koneksi</h3>
        <p className="mt-1 text-sm text-muted">
          API key hanya via <code>.env</code> server — tidak bisa diubah dari sini.
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-[10px] border border-border px-3 py-2">
            <dt>Social-poster key</dt>
            <dd className="font-semibold">
              {keys.social_poster?.installed ? (
                <span className="text-success">✓ Terpasang (****{keys.social_poster.tail})</span>
              ) : (
                <span className="text-danger">✗ Belum dipasang</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between rounded-[10px] border border-border px-3 py-2">
            <dt>Pengguna aktif</dt>
            <dd className="font-semibold">{username}</dd>
          </div>
        </dl>
        <div className="mt-3">
          <Button variant="secondary" onClick={testConn} loading={testing}>
            Tes koneksi
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-bold">Posting</h3>
        <form onSubmit={save} className="mt-3 space-y-3">
          <Field label="FB Page ID (untuk facebook_page)">
            <Input value={fbPage} onChange={(e) => setFbPage(e.target.value)} placeholder="123456789" autoComplete="off" />
          </Field>
          <Field label="Teks disclosure affiliate">
            <Input value={disclosure} onChange={(e) => setDisclosure(e.target.value)} maxLength={100} placeholder="#affiliate" />
          </Field>
          <Button type="submit" variant="primary" loading={saving}>
            Simpan
          </Button>
        </form>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <h3 className="font-bold">Ganti password</h3>
        <p className="mt-1 text-sm text-muted">Sesi lain langsung tidak berlaku setelah ganti (token version naik).</p>
        <form onSubmit={changePw} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Password lama">
            <Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} required autoComplete="current-password" />
          </Field>
          <Field label="Password baru (min 10 karakter)">
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={10} autoComplete="new-password" />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" loading={pwLoading}>
              Ganti password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
