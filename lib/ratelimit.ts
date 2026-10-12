interface Entry {
  times: number[];
}

const buckets = new Map<string, Entry>();

function prune(key: string, windowMs: number): Entry {
  const now = Date.now();
  let e = buckets.get(key);
  if (!e) {
    e = { times: [] };
    buckets.set(key, e);
  }
  e.times = e.times.filter((t) => now - t < windowMs);
  return e;
}

/**
 * Rate limit sliding-window in-memory.
 * @returns { allowed, retryAfterSec }
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const e = prune(key, windowMs);
  if (e.times.length >= max) {
    const oldest = e.times[0] ?? Date.now();
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - Date.now()) / 1000));
    return { allowed: false, retryAfterSec };
  }
  e.times.push(Date.now());
  return { allowed: true, retryAfterSec: 0 };
}

/** Catat kegagalan (dipanggil hanya saat gagal, agar sukses tidak menghabiskan kuota). */
export function recordFailure(key: string, windowMs: number): void {
  const e = prune(key, windowMs);
  e.times.push(Date.now());
}

/** Cek tanpa mencatat. */
export function checkLimit(key: string, max: number, windowMs: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const e = buckets.get(key);
  const times = (e?.times ?? []).filter((t) => now - t < windowMs);
  if (times.length >= max) {
    const oldest = times[0] ?? now;
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
  }
  return { allowed: true, retryAfterSec: 0 };
}
