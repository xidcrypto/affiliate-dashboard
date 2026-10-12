const TZ = "Asia/Jakarta";

export function formatWIB(isoUtc: string): string {
  try {
    const d = new Date(isoUtc);
    if (Number.isNaN(d.getTime())) return isoUtc;
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: TZ,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoUtc;
  }
}

export function relativeTime(isoUtc: string): string {
  const t = Date.parse(isoUtc);
  if (Number.isNaN(t)) return "-";
  const diff = t - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const past = diff < 0;
  if (mins < 1) return "sekarang";
  if (mins < 60) return past ? `${mins} mnt lalu` : `dalam ${mins} mnt`;
  if (hours < 48) return past ? `${hours} jam lalu` : `dalam ${hours} jam`;
  return past ? `${days} hari lalu` : `dalam ${days} hari`;
}

export function greeting(): string {
  try {
    const h = Number(
      new Intl.DateTimeFormat("id-ID", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date())
    );
    if (h >= 4 && h < 11) return "Selamat pagi";
    if (h >= 11 && h < 15) return "Selamat siang";
    if (h >= 15 && h < 19) return "Selamat sore";
    return "Selamat malam";
  } catch {
    return "Halo";
  }
}

/** Konversi nilai datetime-local (WIB) ke ISO UTC. */
export function wibLocalToUtcIso(local: string): string | null {
  // local: "YYYY-MM-DDTHH:mm" (zona WIB = UTC+7, tanpa DST)
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, Y, Mo, D, h, mi] = m.map(Number);
  const utc = Date.UTC(Y, Mo - 1, D, h - 7, mi);
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Konversi ISO UTC ke nilai datetime-local WIB. */
export function utcIsoToWibLocal(iso: string): string {
  const d = new Date(iso);
  const wib = new Date(d.getTime() + 7 * 3600 * 1000);
  return wib.toISOString().slice(0, 16);
}

export function defaultScheduleLocal(): string {
  return utcIsoToWibLocal(new Date(Date.now() + 3600 * 1000).toISOString());
}
