"use client";
import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import { defaultScheduleLocal } from "@/lib/format-client";

interface Content {
  id: number;
  product_id: number;
  product_name: string;
  hook?: string | null;
  caption?: string | null;
  hashtags?: string | null;
  cta?: string | null;
  media_path?: string | null;
  status: string;
}

const PLATFORMS = [
  { id: "threads", label: "Threads", limit: 500 },
  { id: "facebook", label: "Facebook", limit: 5000 },
  { id: "instagram", label: "Instagram", limit: 2200 },
  { id: "facebook_page", label: "FB Page", limit: 5000 },
];

export function ContentsClient() {
  const { toast } = useToast();
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Content | null>(null);
  const [delTarget, setDelTarget] = useState<Content | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [schedFor, setSchedFor] = useState<Content | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contents");
      const data = await res.json();
      if (res.ok) setItems(data.contents ?? []);
      else toast(data.error || "Gagal memuat konten", "error");
    } catch {
      toast("Tidak dapat terhubung", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    if (!delTarget) return;
    setDelLoading(true);
    try {
      const res = await fetch(`/api/contents/${delTarget.id}`, { method: "DELETE" });
      if (!res.ok) toast("Gagal menghapus", "error");
      else {
        toast("Konten dihapus", "success");
        setDelTarget(null);
        load();
      }
    } catch {
      toast("Tidak dapat terhubung", "error");
    } finally {
      setDelLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada konten"
          message="Buat dari halaman Produk dengan tombol Generate ⚡ — AI akan menulis hook, caption, dan hashtag."
          action={
            <Button variant="primary" onClick={() => (window.location.href = "/products")}>
              Ke halaman Produk
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((c) => (
            <Card key={c.id} className="card-hover flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-muted">{c.product_name}</span>
                <StatusBadge status={c.status} />
              </div>
              {c.hook && <p className="text-base font-bold leading-snug">{c.hook}</p>}
              {c.caption && <p className="whitespace-pre-wrap text-sm text-fg/90">{c.caption}</p>}
              {c.hashtags && <p className="text-xs text-info">{c.hashtags}</p>}
              {c.cta && <p className="text-xs text-muted">CTA: {c.cta}</p>}
              <div className="mt-auto flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setEditing(c)}>
                  <Pencil size={15} /> Edit
                </Button>
                <Button variant="primary" onClick={() => setSchedFor(c)}>
                  <CalendarPlus size={15} /> Jadwalkan
                </Button>
                <Button variant="ghost" onClick={() => setDelTarget(c)} aria-label="Hapus konten">
                  <Trash2 size={15} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <EditModal item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={remove}
        loading={delLoading}
        title="Hapus konten?"
        message="Konten dan jadwal terkait akan ikut terhapus."
        confirmLabel="Ya, hapus"
      />
      <ScheduleModal item={schedFor} onClose={() => setSchedFor(null)} />
    </div>
  );
}

function EditModal({ item, onClose, onSaved }: { item: Content | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ hook: "", caption: "", hashtags: "", cta: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) setForm({ hook: item.hook ?? "", caption: item.caption ?? "", hashtags: item.hashtags ?? "", cta: item.cta ?? "" });
  }, [item]);

  if (!item) return null;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/contents/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "ready" }),
      });
      if (!res.ok) toast("Gagal menyimpan", "error");
      else {
        toast("Konten diperbarui", "success");
        onSaved();
      }
    } catch {
      toast("Tidak dapat terhubung", "error");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Edit konten" wide>
      <form onSubmit={save} className="space-y-3">
        <Field label="Hook">
          <Textarea value={form.hook} onChange={(e) => setForm({ ...form, hook: e.target.value })} rows={2} />
        </Field>
        <Field label="Caption">
          <Textarea value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} rows={5} />
        </Field>
        <Field label="Hashtag">
          <Textarea value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} rows={2} />
        </Field>
        <Field label="CTA">
          <Textarea value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} rows={2} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" loading={saving}>Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}

function ScheduleModal({ item, onClose }: { item: Content | null; onClose: () => void }) {
  const { toast } = useToast();
  const [plats, setPlats] = useState<string[]>(["threads"]);
  const [when, setWhen] = useState(defaultScheduleLocal());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setPlats(["threads"]);
      setWhen(defaultScheduleLocal());
    }
  }, [item]);

  if (!item) return null;
  const toggle = (p: string) =>
    setPlats((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const caption = item.caption ?? "";
  const preview = (pid: string): string => {
    if (pid === "threads") {
      const t = `${caption}\n\n[link afiliasi]`.trim();
      return t.length > 500 ? t.slice(0, 497) + "…" : t;
    }
    if (pid === "instagram") {
      const t = `${item.hook ?? ""}\n\n${caption}\n\n${item.hashtags ?? ""}`.trim();
      return t.length > 2200 ? t.slice(0, 2197) + "…" : t;
    }
    return `${item.hook ?? ""}\n\n${caption}\n\n[link afiliasi]`.trim();
  };

  const save = async () => {
    if (!plats.length) {
      toast("Pilih minimal 1 platform", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: item.id, platforms: plats, publish_at: when }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast(data.error || "Gagal menjadwalkan", "error");
      else {
        toast("Jadwal dibuat", "success");
        onClose();
      }
    } catch {
      toast("Tidak dapat terhubung", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Jadwalkan postingan" wide>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">Platform</p>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((p) => {
              const active = plats.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  aria-pressed={active}
                  className={`min-h-[44px] rounded-[12px] border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    active ? "grad-accent border-transparent text-white" : "border-border text-muted hover:bg-surface2"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="sched-when">
            Waktu tayang (WIB)
          </label>
          <input
            id="sched-when"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="min-h-[44px] w-full rounded-[12px] border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        {plats.map((pid) => {
          const lim = PLATFORMS.find((p) => p.id === pid)?.limit ?? 500;
          const txt = preview(pid);
          const over = txt.length > lim;
          return (
            <div key={pid} className="rounded-[12px] border border-border p-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-bold uppercase">{pid}</span>
                <span className={`tnum font-semibold ${over ? "text-danger" : "text-muted"}`}>
                  {txt.length}/{lim}
                </span>
              </div>
              {/* Mockup bingkai HP */}
              <div className="mx-auto max-w-[300px] rounded-[20px] border border-border bg-surface2 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500" aria-hidden />
                  <div>
                    <p className="text-xs font-bold">toko.kamu</p>
                    <p className="text-[10px] text-muted">Disponsori</p>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed">{txt}</p>
              </div>
              {over && <p className="mt-1 text-xs text-danger">Melebihi batas karakter — Threads akan dipotong otomatis.</p>}
            </div>
          );
        })}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="primary" onClick={save} loading={saving}>Simpan jadwal</Button>
        </div>
      </div>
    </Modal>
  );
}
