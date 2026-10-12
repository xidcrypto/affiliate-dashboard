"use client";
import { useCallback, useEffect, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { PlatformBadge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";

interface Sched {
  id: number;
  content_id: number;
  platforms: string;
  publish_at: string;
  status: string;
  attempts: number;
  job_id?: string | null;
  note?: string | null;
  product_name?: string;
}

const TABS = [
  { id: "all", label: "Semua" },
  { id: "scheduled", label: "Terjadwal" },
  { id: "sent", label: "Terkirim" },
  { id: "failed", label: "Gagal" },
];

function fmtWIB(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function rel(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "-";
  const diff = t - Date.now();
  const mins = Math.round(Math.abs(diff) / 60000);
  if (mins < 1) return "sekarang";
  if (mins < 60) return diff < 0 ? `${mins} mnt lalu` : `dalam ${mins} mnt`;
  const h = Math.round(mins / 60);
  if (h < 48) return diff < 0 ? `${h} jam lalu` : `dalam ${h} jam`;
  return diff < 0 ? `${Math.round(h / 24)} hari lalu` : `dalam ${Math.round(h / 24)} hari`;
}

export function SchedulesClient() {
  const { toast } = useToast();
  const [tab, setTab] = useState("all");
  const [items, setItems] = useState<Sched[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Sched | null>(null);
  const [busy, setBusy] = useState(false);
  const [noteFor, setNoteFor] = useState<Sched | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedules?status=${tab}`);
      const data = await res.json();
      if (res.ok) setItems(data.schedules ?? []);
      else toast(data.error || "Gagal memuat jadwal", "error");
    } catch {
      toast("Tidak dapat terhubung", "error");
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async () => {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/schedules/${cancelTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast(data.error || "Gagal membatalkan", "error");
      else {
        toast("Jadwal dibatalkan", "success");
        setCancelTarget(null);
        load();
      }
    } catch {
      toast("Tidak dapat terhubung", "error");
    } finally {
      setBusy(false);
    }
  };

  const retry = async (s: Sched) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/schedules/${s.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retry: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast(data.error || "Gagal menjadwalkan ulang", "error");
      else {
        toast("Dijadwalkan ulang (+2 menit)", "success");
        load();
      }
    } catch {
      toast("Tidak dapat terhubung", "error");
    } finally {
      setBusy(false);
    }
  };

  const plats = (s: Sched): string[] => {
    try {
      const p = JSON.parse(s.platforms);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Filter status" className="flex gap-1 overflow-x-auto rounded-[12px] border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-[44px] flex-1 whitespace-nowrap rounded-[10px] px-4 text-sm font-semibold ${
              tab === t.id ? "grad-accent text-white" : "text-muted hover:bg-surface2"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Tidak ada jadwal" message="Jadwalkan konten dari halaman Konten — pilih platform dan waktu tayang." />
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <Card key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{s.product_name ?? `Konten #${s.content_id}`}</p>
                <p className="tnum text-xs text-muted">
                  {fmtWIB(s.publish_at)} WIB · {rel(s.publish_at)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {plats(s).map((p) => (
                    <PlatformBadge key={p} platform={p} />
                  ))}
                  <StatusBadge status={s.status} />
                  {s.job_id && <span className="tnum text-[11px] text-muted">job: {s.job_id}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {s.note && (
                  <Button variant="ghost" onClick={() => setNoteFor(s)}>
                    Catatan
                  </Button>
                )}
                {s.status === "failed" && (
                  <Button variant="secondary" onClick={() => retry(s)} disabled={busy}>
                    <RotateCcw size={15} /> Coba lagi
                  </Button>
                )}
                {s.status === "scheduled" && (
                  <Button variant="ghost" onClick={() => setCancelTarget(s)} aria-label="Batalkan jadwal">
                    <X size={15} /> Batalkan
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={cancel}
        loading={busy}
        title="Batalkan jadwal?"
        message="Jadwal yang dibatalkan tidak akan diposting."
        confirmLabel="Ya, batalkan"
      />
      <Modal open={!!noteFor} onClose={() => setNoteFor(null)} title="Catatan kegagalan">
        <p className="whitespace-pre-wrap text-sm">{noteFor?.note}</p>
      </Modal>
    </div>
  );
}
