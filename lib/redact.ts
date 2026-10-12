/** Samarkan secret: tampilkan hanya 4 karakter terakhir. */
export function redact(value: unknown): string {
  if (value === null || value === undefined) return "****";
  const s = String(value);
  if (s.length <= 4) return "****";
  return `****${s.slice(-4)}`;
}

/** Samarkan semua kemunculan secret di dalam teks bebas. */
export function redactText(text: string, secrets: (string | undefined | null)[]): string {
  let out = text;
  for (const s of secrets) {
    if (!s || s.length < 4) continue;
    // Ganti kemunculan penuh + tampilkan versi redact di akhir bila relevan.
    out = out.split(s).join(redact(s));
  }
  return out;
}

export function keyStatus(value: string | undefined | null): {
  installed: boolean;
  tail: string;
} {
  if (!value) return { installed: false, tail: "" };
  return { installed: true, tail: value.slice(-4) };
}
