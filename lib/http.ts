export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 30000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "AbortError") return "waktu habis (timeout)";
    return e.message;
  }
  return "kesalahan tidak dikenal";
}
