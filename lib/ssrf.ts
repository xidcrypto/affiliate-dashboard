import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { getSetting } from "./settings";
import { log } from "./log";
import { redactText } from "./redact";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 30000;

const ALLOWED_CT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

function inCidr(ip: string, cidr: string): boolean {
  const [base, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const a = ipv4ToInt(ip);
  const b = ipv4ToInt(base);
  if (a === null || b === null) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1) >>> 0);
  return (a & mask) === (b & mask);
}

const IPV4_BLOCKED = [
  "127.0.0.0/8",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "169.254.0.0/16",
  "0.0.0.0/8",
];

function normalizeIp(ip: string): string {
  // Kupas ::ffff:a.b.c.d menjadi IPv4.
  const m = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return m[1];
  return ip.toLowerCase();
}

export function isBlockedIp(raw: string): boolean {
  const ip = normalizeIp(raw);
  if (!net.isIP(ip)) return true; // bukan IP valid -> tolak
  if (net.isIPv4(ip)) {
    if (ip === "0.0.0.0") return true;
    return IPV4_BLOCKED.some((c) => inCidr(ip, c));
  }
  // IPv6
  if (ip === "::1" || ip === "::") return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // fc00::/7
  if (ip.startsWith("fe80") || ip.startsWith("fe90") || ip.startsWith("fea") || ip.startsWith("feb")) return true; // fe80::/10 (kasar tapi aman)
  if (ip.startsWith("fec") || ip.startsWith("fed") || ip.startsWith("fee") || ip.startsWith("fef")) return true;
  return false;
}

export async function assertHostPublic(hostname: string): Promise<void> {
  const clean = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(clean)) {
    if (isBlockedIp(clean)) throw new Error("Host IP privat/loopback ditolak");
    return;
  }
  let addrs;
  try {
    addrs = await lookup(clean, { all: true });
  } catch {
    throw new Error("Gagal resolve DNS host gambar");
  }
  if (!addrs.length) throw new Error("Host tidak punya alamat IP");
  for (const a of addrs) {
    if (isBlockedIp(a.address)) throw new Error("Host resolve ke IP privat/loopback — ditolak");
  }
}

function extFromContentType(ct: string | null): string | null {
  if (!ct) return null;
  const mime = ct.split(";")[0]?.trim().toLowerCase() ?? "";
  return ALLOWED_CT[mime] ?? null;
}

function checkMagic(buf: Buffer, ext: string): boolean {
  if (ext === "jpg") return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === "png")
    return (
      buf.length >= 8 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
      buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    );
  if (ext === "webp")
    return (
      buf.length >= 12 &&
      buf.toString("ascii", 0, 4) === "RIFF" &&
      buf.toString("ascii", 8, 12) === "WEBP"
    );
  return false;
}

export interface DownloadResult {
  ok: boolean;
  filename?: string;
  note?: string;
}

function allowHttp(): boolean {
  try {
    return (getSetting("allow_http_image") || "0") === "1";
  } catch {
    return false;
  }
}

/**
 * Download gambar dengan perlindungan SSRF.
 * Return { ok:false, note } bila gagal (pemanggil lanjut tanpa media).
 */
export async function downloadImageSafe(imageUrl: string): Promise<DownloadResult> {
  let current: URL;
  try {
    current = new URL(imageUrl);
  } catch {
    return { ok: false, note: "URL gambar tidak valid" };
  }
  if (current.protocol !== "https:" && !(current.protocol === "http:" && allowHttp())) {
    return { ok: false, note: "URL gambar harus https" };
  }
  if (!["http:", "https:"].includes(current.protocol)) {
    return { ok: false, note: "Skema URL gambar ditolak" };
  }
  if (current.port && current.port !== "80" && current.port !== "443") {
    return { ok: false, note: "Port URL gambar ditolak" };
  }
  if (current.username || current.password) {
    return { ok: false, note: "URL gambar dengan kredensial ditolak" };
  }

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertHostPublic(current.hostname);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(current.toString(), {
          signal: ctrl.signal,
          redirect: "manual",
          headers: { "User-Agent": "AffiliateDashboard/1.0 (image-fetch)" },
        });
      } finally {
        clearTimeout(t);
      }
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        if (hop === MAX_REDIRECTS) return { ok: false, note: "Terlalu banyak redirect" };
        const loc = res.headers.get("location");
        await res.arrayBuffer().catch(() => null);
        if (!loc) return { ok: false, note: "Redirect tanpa Location" };
        const next = new URL(loc, current.toString());
        if (next.protocol !== "https:" && !(next.protocol === "http:" && allowHttp())) {
          return { ok: false, note: "Redirect ke skema non-https ditolak" };
        }
        if (next.port && next.port !== "80" && next.port !== "443") {
          return { ok: false, note: "Redirect ke port ditolak" };
        }
        current = next;
        continue;
      }
      if (!res.ok) {
        await res.arrayBuffer().catch(() => null);
        return { ok: false, note: `Unduh gambar gagal (HTTP ${res.status})` };
      }
      const ext = extFromContentType(res.headers.get("content-type"));
      if (!ext) {
        await res.arrayBuffer().catch(() => null);
        return { ok: false, note: "Tipe konten bukan gambar (jpeg/png/webp)" };
      }
      // Streaming dengan batas ukuran.
      const reader = res.body?.getReader();
      if (!reader) return { ok: false, note: "Body respons kosong" };
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > MAX_BYTES) {
            try { await reader.cancel(); } catch { /* abaikan */ }
            return { ok: false, note: "Ukuran gambar melebihi 10 MB" };
          }
          chunks.push(value);
        }
      }
      const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      if (!checkMagic(buf, ext)) {
        return { ok: false, note: "Isi file bukan gambar valid (magic bytes)" };
      }
      const filename = `${randomUUID()}.${ext}`;
      const dest = path.join(process.cwd(), "data", "media", filename);
      fs.writeFileSync(dest, buf);
      try {
        fs.chmodSync(dest, 0o600);
      } catch {
        /* abaikan di FS non-posix */
      }
      return { ok: true, filename };
    }
    return { ok: false, note: "Terlalu banyak redirect" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "gagal mengunduh";
    if (msg.includes("privat") || msg.includes("ditolak") || msg.includes("DNS") || msg.includes("resolve")) {
      return { ok: false, note: msg };
    }
    log.warn(`Unduh gambar gagal: ${redactText(msg, [process.env.SOCIAL_POSTER_KEY])}`);
    if (msg.includes("abort")) return { ok: false, note: "Unduh gambar timeout (30 dtk)" };
    return { ok: false, note: "Gagal mengunduh gambar" };
  }
}
