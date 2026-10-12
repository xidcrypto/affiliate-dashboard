import { clsx } from "clsx";

export function Badge({ tone = "info", children }: { tone?: "info" | "success" | "warning" | "danger" | "muted"; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "success" && "bg-success/15 text-success",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "danger" && "bg-danger/15 text-danger",
        tone === "info" && "bg-info/15 text-info",
        tone === "muted" && "bg-surface2 text-muted"
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
    ready: "success",
    draft: "muted",
    needs_review: "warning",
    scheduled: "info",
    processing: "warning",
    sent: "success",
    failed: "danger",
    cancelled: "muted",
  };
  const label: Record<string, string> = {
    ready: "Siap",
    draft: "Draf",
    needs_review: "Perlu review",
    scheduled: "Terjadwal",
    processing: "Diproses",
    sent: "Terkirim",
    failed: "Gagal",
    cancelled: "Dibatalkan",
  };
  return <Badge tone={map[status] ?? "muted"}>{label[status] ?? status}</Badge>;
}

export function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    instagram: "bg-gradient-to-r from-pink-500 to-amber-500 text-white",
    facebook: "bg-blue-600/20 text-blue-400",
    facebook_page: "bg-blue-600/20 text-blue-300",
    threads: "bg-surface2 text-fg",
  };
  const labels: Record<string, string> = {
    instagram: "IG",
    facebook: "FB",
    facebook_page: "FP",
    threads: "Threads",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${colors[platform] ?? "bg-surface2 text-muted"}`}>
      {labels[platform] ?? platform}
    </span>
  );
}
