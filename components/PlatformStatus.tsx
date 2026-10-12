"use client";
import { useEffect, useState } from "react";
import { AtSign, Camera, MessageCircle } from "lucide-react";
import { StatusBadge } from "./ui/Badge";

export function PlatformStatus() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/poster/status")
      .then((r) => r.json())
      .then((j) => {
        if (alive) setData((j.status ?? {}) as Record<string, unknown>);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  const rows = [
    { key: "instagram", label: "Instagram", icon: <Camera size={16} /> },
    { key: "threads", label: "Threads", icon: <AtSign size={16} /> },
    { key: "facebook", label: "Facebook", icon: <MessageCircle size={16} /> },
  ];
  if (error) return <p className="text-sm text-danger">Social-poster tidak terjangkau.</p>;
  if (!data) return <p className="text-sm text-muted">Memeriksa status...</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const v = data[r.key] as Record<string, unknown> | boolean | undefined;
        const linked =
          typeof v === "object" && v !== null
            ? !!((v as Record<string, unknown>).linked ?? (v as Record<string, unknown>).connected)
            : !!v;
        return (
          <li key={r.key} className="flex items-center gap-2 text-sm">
            <span className="text-muted">{r.icon}</span>
            <span className="flex-1">{r.label}</span>
            {linked ? <StatusBadge status="sent" /> : <span className="text-xs text-muted">Belum terhubung</span>}
          </li>
        );
      })}
      <li>
        <a href="/queue" className="text-sm font-semibold text-accent1 hover:underline">
          Buka halaman Antrean untuk menautkan →
        </a>
      </li>
    </ul>
  );
}
