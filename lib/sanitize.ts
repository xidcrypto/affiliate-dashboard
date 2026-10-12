/** Buang karakter kontrol kecuali \n dan \t, lalu trim. */
export function cleanText(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max).trimEnd();
}

const HASHTAG_RE = /#[\p{L}\p{N}_]{1,40}/gu;
const HASHTAG_FULL = /^(#[\p{L}\p{N}_]{1,40})(\s#[\p{L}\p{N}_]{1,40}){0,9}$/u;

/** Perbaiki hashtags otomatis: ekstrak tag valid, dedupe, maks 10. */
export function fixHashtags(raw: string): string {
  const cleaned = cleanText(raw);
  if (!cleaned) return "";
  if (HASHTAG_FULL.test(cleaned)) return truncate(cleaned, 500);
  HASHTAG_RE.lastIndex = 0;
  const found = cleaned.match(HASHTAG_RE) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of found) {
    const low = t.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(t);
    if (out.length >= 10) break;
  }
  return out.join(" ");
}

export interface GeneratedParts {
  hook: string;
  caption: string;
  hashtags: string;
  cta: string;
}

export function sanitizeGenerated(input: {
  hook?: unknown;
  caption?: unknown;
  hashtags?: unknown;
  cta?: unknown;
}): GeneratedParts {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    hook: truncate(cleanText(s(input.hook)), 150),
    caption: truncate(cleanText(s(input.caption)), 450),
    hashtags: truncate(fixHashtags(s(input.hashtags)), 500),
    cta: truncate(cleanText(s(input.cta)), 200),
  };
}

/** Bersihkan blok ```json bila ada, lalu parse. */
export function parseLlmJson(raw: string): Record<string, unknown> {
  let t = raw.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) t = fence[1].trim();
  // Ambilsubstring objek JSON terluar bila ada teks pengantar.
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t) as Record<string, unknown>;
}
