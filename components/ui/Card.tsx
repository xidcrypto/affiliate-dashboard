import { clsx } from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx("rounded-card border border-border bg-surface shadow-soft", className)}>
      {children}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  spark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  spark?: number[];
}) {
  const pts = spark && spark.length > 1 ? spark : null;
  const max = pts ? Math.max(...pts, 1) : 1;
  const min = pts ? Math.min(...pts, 0) : 0;
  const path = pts
    ? pts
        .map((v, i) => {
          const x = (i / (pts.length - 1)) * 96;
          const y = 28 - ((v - min) / Math.max(1, max - min)) * 24;
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ")
    : "";
  return (
    <Card className="card-hover p-4">
      <div className="flex items-center gap-2 text-muted">
        <span aria-hidden>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="tnum mt-2 text-3xl font-bold">{value}</div>
      {path && (
        <svg viewBox="0 0 96 32" className="mt-2 h-8 w-24 text-accent1" aria-hidden>
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </Card>
  );
}
