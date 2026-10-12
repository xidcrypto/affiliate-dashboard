"use client";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Field, Textarea } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { EmptyState, Skeleton } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";

interface Product {
  id: number;
  name: string;
  url?: string | null;
  price?: string | null;
  original_price?: string | null;
  image_url?: string | null;
  rating?: string | null;
  sold_count?: string | null;
  affiliate_link: string;
  content_count?: number;
}

interface GenContent {
  id: number;
  hook?: string;
  caption?: string;
  hashtags?: string;
  cta?: string;
  media_path?: string | null;
  status?: string;
}

const STEPS = ["Menganalisis produk", "Menulis hook & caption", "Menyiapkan gambar", "Selesai"];

export function ProductsClient() {
  const { toast } = useToast();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [modal, setModal] = useState<null | { mode: "add" } | { mode: "edit"; item: Product }>(null);
  const [delTarget, setDelTarget] = useState<Product | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  // Generate panel
  const [genFor, setGenFor] = useState<Product | null>(null);
  const [genStep, setGenStep] = useState(0);
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<GenContent | null>(null);
  const [genNote, setGenNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("sort", sort);
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setItems(data.products ?? []);
      else toast(data.error || "Gagal memuat produk", "error");
    } catch {
      toast("Tidak dapat terhubung", "error");
    } finally {
      setLoading(false);
    }
  }, [q, sort, toast]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const remove = async () => {
    if (!delTarget) return;
    setDelLoading(true);
    try {
      const res = await fetch(`/api/products/${delTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast(d.error || "Gagal menghapus", "error");
      } else {
        toast("Produk dihapus", "success");
        setDelTarget(null);
        load();
      }
    } catch {
      toast("Tidak dapat terhubung", "error");
    } finally {
      setDelLoading(false);
    }
  };

  const runGenerate = async (p: Product) => {
    setGenFor(p);
    setGenResult(null);
    setGenNote("");
    setGenStep(0);
    setGenLoading(true);
    try {
      const res = await fetch(`/api/products/${p.id}/generate`, { method: "POST" });
      if (res.status === 429) {
        toast("Terlalu banyak generate, coba lagi sebentar", "error");
        setGenLoading(false);
        return;
      }
      if (!res.ok && !res.body) {
        const d = await res.json().catch(() => ({}));
        toast(d.error || "Gagal generate", "error");
        setGenLoading(false);
        return;
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line);
            if (ev.step === "analyzing") setGenStep(0);
            else if (ev.step === "writing") setGenStep(1);
            else if (ev.step === "media") setGenStep(2);
            else if (ev.step === "done") {
              setGenStep(3);
              setGenResult(ev.content);
              if (ev.mediaNote) setGenNote(ev.mediaNote);
              load();
            } else if (ev.step === "error") {
              toast(ev.message || "Generate gagal", "error");
              setGenLoading(false);
            }
          } catch {
            /* abaikan baris rusak */
          }
        }
      }
    } catch {
      toast("Koneksi generate terputus", "error");
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk..." aria-label="Cari produk" className="pl-9" />
        </div>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Urutkan"
            className="min-h-[44px] rounded-[12px] border border-border bg-surface px-3 text-sm"
          >
            <option value="newest">Terbaru</option>
            <option value="name">Nama A-Z</option>
          </select>
          <Button variant="primary" onClick={() => setModal({ mode: "add" })}>
            <Plus size={16} /> Produk baru
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada produk"
          message="Tambah yang pertama: nama, link affiliate, harga, dan foto — lalu generate konten AI."
          action={
            <Button variant="primary" onClick={() => setModal({ mode: "add" })}>
              <Plus size={16} /> Tambah produk
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted">
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3">Harga</th>
                  <th className="px-4 py-3">Terjual</th>
                  <th className="px-4 py-3">Konten</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface2/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="h-10 w-10 rounded-[10px] object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface2 text-muted">📦</div>
                        )}
                        <span className="font-semibold">{p.name}</span>
                      </div>
                    </td>
                    <td className="tnum px-4 py-3">{p.price || "-"}</td>
                    <td className="px-4 py-3">{p.sold_count || "-"}</td>
                    <td className="tnum px-4 py-3">{p.content_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <ActionBtn label="Generate AI" onClick={() => runGenerate(p)} icon={<Zap size={16} />} primary />
                        <ActionBtn label="Edit" onClick={() => setModal({ mode: "edit", item: p })} icon={<Pencil size={16} />} />
                        <ActionBtn label="Hapus" onClick={() => setDelTarget(p)} icon={<Trash2 size={16} />} danger />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {items.map((p) => (
              <Card key={p.id} className="card-hover p-4">
                <div className="flex gap-3">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="h-16 w-16 shrink-0 rounded-[12px] object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[12px] bg-surface2 text-xl">📦</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{p.name}</p>
                    <p className="tnum text-sm text-muted">
                      {p.price || "-"} · {p.sold_count || "-"} terjual · {p.content_count ?? 0} konten
                    </p>
                    <div className="mt-2 flex gap-1">
                      <ActionBtn label="Generate AI" onClick={() => runGenerate(p)} icon={<Zap size={16} />} primary />
                      <ActionBtn label="Edit" onClick={() => setModal({ mode: "edit", item: p })} icon={<Pencil size={16} />} />
                      <ActionBtn label="Hapus" onClick={() => setDelTarget(p)} icon={<Trash2 size={16} />} danger />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ProductModal modal={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />

      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={remove}
        loading={delLoading}
        title="Hapus produk?"
        message={`"${delTarget?.name}" beserta semua konten & jadwalnya akan dihapus permanen.`}
        confirmLabel="Ya, hapus"
      />

      {/* Panel hasil generate */}
      <Modal open={!!genFor} onClose={() => !genLoading && setGenFor(null)} title={`Generate ⚡ — ${genFor?.name ?? ""}`} wide>
        <ol className="mb-4 space-y-2" aria-label="Progres generate">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  i < genStep || (i === 3 && genResult) ? "grad-accent text-white" : i === genStep && genLoading ? "animate-pulse bg-warning/30 text-warning" : "bg-surface2 text-muted"
                }`}
              >
                {i + 1}
              </span>
              <span className={i <= genStep ? "font-semibold" : "text-muted"}>{s}</span>
            </li>
          ))}
        </ol>
        {genResult ? (
          <div className="space-y-3">
            <div className="rounded-[12px] border border-border bg-surface2 p-4">
              <p className="text-xs uppercase text-muted">Hook</p>
              <p className="text-lg font-bold">{genResult.hook}</p>
            </div>
            <div className="rounded-[12px] border border-border p-4">
              <p className="text-xs uppercase text-muted">Caption</p>
              <p className="whitespace-pre-wrap text-sm">{genResult.caption}</p>
            </div>
            {genResult.hashtags && (
              <div className="flex flex-wrap gap-1">
                {genResult.hashtags.split(/\s+/).filter(Boolean).map((h) => (
                  <span key={h} className="rounded-full bg-info/15 px-2.5 py-0.5 text-xs font-semibold text-info">{h}</span>
                ))}
              </div>
            )}
            {genResult.cta && <p className="text-sm text-muted">CTA: {genResult.cta}</p>}
            {genNote && <p className="text-xs text-warning">Catatan gambar: {genNote}</p>}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => genFor && runGenerate(genFor)} disabled={genLoading}>
                <Zap size={16} /> Regenerate
              </Button>
              <Button variant="secondary" onClick={() => (window.location.href = "/contents")}>
                Lihat di Konten →
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">{genLoading ? "AI sedang memproses, mohon tunggu..." : "Menunggu hasil..."}</p>
        )}
      </Modal>
    </div>
  );
}

function ActionBtn({ label, onClick, icon, primary, danger }: { label: string; onClick: () => void; icon: React.ReactNode; primary?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-11 min-w-[44px] items-center justify-center gap-1 rounded-[10px] border px-2 text-sm font-semibold transition-colors ${
        primary
          ? "grad-accent border-transparent text-white"
          : danger
            ? "border-danger/30 text-danger hover:bg-danger/10"
            : "border-border text-muted hover:bg-surface2 hover:text-fg"
      }`}
    >
      {icon}
      {primary && <span className="hidden lg:inline">Generate</span>}
    </button>
  );
}

function ProductModal({
  modal,
  onClose,
  onSaved,
}: {
  modal: null | { mode: "add" } | { mode: "edit"; item: Product };
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const editing = modal?.mode === "edit" ? modal.item : null;
  const [form, setForm] = useState({ name: "", affiliate_link: "", url: "", price: "", original_price: "", image_url: "", rating: "", sold_count: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name ?? "",
        affiliate_link: editing.affiliate_link ?? "",
        url: editing.url ?? "",
        price: editing.price ?? "",
        original_price: editing.original_price ?? "",
        image_url: editing.image_url ?? "",
        rating: editing.rating ?? "",
        sold_count: editing.sold_count ?? "",
      });
    } else {
      setForm({ name: "", affiliate_link: "", url: "", price: "", original_price: "", image_url: "", rating: "", sold_count: "" });
    }
    setError("");
  }, [modal, editing]);

  if (!modal) return null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.affiliate_link.trim()) {
      setError("Nama dan link affiliate wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/products/${editing.id}` : "/api/products";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      toast(editing ? "Produk diperbarui" : "Produk ditambahkan", "success");
      onSaved();
    } catch {
      setError("Tidak dapat terhubung");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Edit produk" : "Produk baru"} wide>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nama produk *" error={undefined}>
            <Input value={form.name} onChange={set("name")} maxLength={200} required placeholder="Cushion matte tahan 12 jam" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Link affiliate *">
            <Input value={form.affiliate_link} onChange={set("affiliate_link")} required placeholder="https://..." inputMode="url" />
          </Field>
        </div>
        <Field label="URL produk">
          <Input value={form.url} onChange={set("url")} placeholder="https://..." inputMode="url" />
        </Field>
        <Field label="URL gambar">
          <Input value={form.image_url} onChange={set("image_url")} placeholder="https://..." inputMode="url" />
        </Field>
        <Field label="Harga">
          <Input value={form.price} onChange={set("price")} placeholder="Rp49.000" />
        </Field>
        <Field label="Harga coret">
          <Input value={form.original_price} onChange={set("original_price")} placeholder="Rp99.000" />
        </Field>
        <Field label="Rating">
          <Input value={form.rating} onChange={set("rating")} placeholder="4.9" />
        </Field>
        <Field label="Terjual">
          <Input value={form.sold_count} onChange={set("sold_count")} placeholder="10RB+" />
        </Field>
        {error && (
          <p role="alert" className="rounded-[12px] border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Re-export agar Next tidak menganggap file ini route (hanya client component).
export function __noop() {
  return null;
}
void Textarea;
