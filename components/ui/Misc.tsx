"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-[12px] ${className}`} />;
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden className="text-muted">
        <rect x="8" y="12" width="48" height="36" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="24" cy="26" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 44l12-10 8 6 8-8 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function CopyButton({ text, label = "Salin" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* abaikan */
        }
      }}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-muted hover:bg-surface2 hover:text-fg"
    >
      {done ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex" title={text}>
      {children}
    </span>
  );
}
