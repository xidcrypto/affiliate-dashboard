"use client";
// Helper tanggal versi client (tanpa dependensi server).
export function utcIsoToWibLocal(iso: string): string {
  const d = new Date(iso);
  const wib = new Date(d.getTime() + 7 * 3600 * 1000);
  return wib.toISOString().slice(0, 16);
}
export function defaultScheduleLocal(): string {
  return utcIsoToWibLocal(new Date(Date.now() + 3600 * 1000).toISOString());
}
