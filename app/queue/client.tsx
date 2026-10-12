"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, Skeleton } from "@/components/ui/Misc";

interface Job {
  id: string | number | null;
  text: string;
  platforms: unknown;
  status: unknown;
  publish_at: unknown;
}

export function QueueClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/poster/queue");
      const data = await res.json();
      if (data.error) setError(data.error);
      else setError("");
      setJobs(data.queue ?? []);
    } catch {
      setError("Tidak dapat menghubungi social-poster");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh 30 dtk, jeda saat tab tidak aktif.
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, 30000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <Card className="border-info/30 bg-info/5 p-4 text-sm">
        <p>
          <span aria-hidden>ℹ️ </span>
          Setiap posting butuh <strong>1x tap persetujuan di aplikasi</strong> saat kartunya muncul — pantau antrean di sini.
        </p>
      </Card>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => { setLoading(true); load(); }}>
          <RefreshCw size={15} /> Muat ulang
        </Button>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Antrean tak tersedia" message={error} />
      ) : jobs.length === 0 ? (
        <EmptyState title="Antrean kosong" message="Belum ada job di social-poster. Jadwal yang terkirim akan muncul di sini." />
      ) : (
        <ol className="relative space-y-3 border-l-2 border-border pl-4">
          {jobs.map((j, i) => (
            <li key={String(j.id ?? i)}>
              <span aria-hidden className="absolute -left-[7px] mt-4 h-3 w-3 rounded-full bg-accent1" />
              <Card className="p-4">
                <p className="text-sm">{j.text || "(tanpa teks)"}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span>ID: {String(j.id ?? "-")}</span>
                  <span>Platform: {typeof j.platforms === "string" ? j.platforms : JSON.stringify(j.platforms ?? "-")}</span>
                  <span>Status: {typeof j.status === "string" ? j.status : JSON.stringify(j.status ?? "-")}</span>
                  <span className="tnum">Waktu: {typeof j.publish_at === "string" ? j.publish_at : JSON.stringify(j.publish_at ?? "-")}</span>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
