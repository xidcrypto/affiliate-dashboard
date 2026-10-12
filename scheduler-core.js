// Scheduler core (plain JS, CommonJS) — dipakai server.js & skrip tes.
// Sengaja tanpa dependency TS agar bisa di-require langsung.

const fs = require("node:fs");
const path = require("node:path");

function ts() {
  return new Date().toISOString();
}
function log(level, msg, extra) {
  const line = JSON.stringify({ ts: ts(), level, msg, ...(extra || {}) });
  if (level === "error") console.error(line);
  else console.log(line);
}

function redactStr(s, secrets) {
  let out = String(s);
  for (const sec of secrets || []) {
    if (!sec || sec.length < 4) continue;
    out = out.split(sec).join("****" + sec.slice(-4));
  }
  return out;
}

async function fetchTimeout(url, init, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs || 30000);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function disclosure(db) {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'disclosure_text'").get();
    return (row && row.value) || "#affiliate";
  } catch {
    return "#affiliate";
  }
}
function fbPageId(db, envFallback) {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'FB_PAGE_ID'").get();
    return (row && row.value) || envFallback || "";
  } catch {
    return envFallback || "";
  }
}

function withDisclosure(text, d) {
  if (!d) return text;
  if (text.includes(d)) return text;
  return `${text}\n\n${d}`;
}

function buildThreadsText(caption, link, d) {
  const base = `${caption}\n\n${link}`.trim();
  const full = withDisclosure(base, d);
  if (full.length <= 500) return full;
  const suffix = `\n\n${link}\n\n${d}`;
  const budget = 500 - suffix.length;
  const cut = caption.slice(0, Math.max(0, budget)).trimEnd();
  return `${cut}${suffix}`;
}

/**
 * Proses jadwal jatuh tempo. Atomic claim per baris.
 * deps: { posterUrl, posterKey, fetchFn?, uploadFn? } — fetchFn untuk mock tes.
 */
async function processDueSchedules(db, deps) {
  const posterUrl = (deps.posterUrl || "").replace(/\/$/, "");
  const posterKey = deps.posterKey || "";
  const secrets = [posterKey];
  const now = new Date();
  const nowIso = now.toISOString();

  const due = db
    .prepare("SELECT * FROM schedules WHERE status = 'scheduled' AND publish_at <= ? ORDER BY publish_at ASC LIMIT 20")
    .all(nowIso);

  for (const s of due) {
    // Klaim atomik.
    const lockedAt = nowIso;
    let claim;
    try {
      claim = db
        .prepare("UPDATE schedules SET status = 'processing', locked_at = ?, attempts = attempts + 1 WHERE id = ? AND status = 'scheduled'")
        .run(lockedAt, s.id);
    } catch (e) {
      log("error", `klaim jadwal ${s.id} gagal: ${redactStr(e.message, secrets)}`);
      continue;
    }
    if (claim.changes !== 1) continue; // diambil proses lain

    try {
      await executeSchedule(db, s, { posterUrl, posterKey, secrets, lockedAt, ...deps });
    } catch (e) {
      const msg = e && e.message ? e.message : "kesalahan tidak dikenal";
      log("error", `eksekusi jadwal ${s.id} gagal: ${redactStr(msg, secrets)}`);
      try {
        db.prepare("UPDATE schedules SET status = 'failed', note = ? WHERE id = ?").run(
          `Gagal: ${redactStr(msg, secrets)}`.slice(0, 500),
          s.id
        );
      } catch { /* abaikan */ }
    }
  }
  return due.length;
}

async function executeSchedule(db, s, opts) {
  const { posterUrl, posterKey, secrets } = opts;
  const content = db.prepare("SELECT * FROM contents WHERE id = ?").get(s.content_id);
  if (!content) {
    db.prepare("UPDATE schedules SET status = 'failed', note = 'Konten tidak ditemukan' WHERE id = ?").run(s.id);
    return;
  }
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(content.product_id);
  if (!product) {
    db.prepare("UPDATE schedules SET status = 'failed', note = 'Produk tidak ditemukan' WHERE id = ?").run(s.id);
    return;
  }

  // Telat > 6 jam -> failed "terlewat".
  const publishMs = Date.parse(s.publish_at);
  if (!Number.isNaN(publishMs) && Date.now() - publishMs > 6 * 3600 * 1000) {
    db.prepare("UPDATE schedules SET status = 'failed', note = 'terlewat (lebih dari 6 jam)' WHERE id = ?").run(s.id);
    return;
  }

  let platforms;
  try {
    platforms = JSON.parse(s.platforms);
    if (!Array.isArray(platforms)) throw new Error("bad");
  } catch {
    db.prepare("UPDATE schedules SET status = 'failed', note = 'Platform tidak valid' WHERE id = ?").run(s.id);
    return;
  }
  const allowed = new Set(["threads", "facebook", "instagram", "facebook_page"]);
  platforms = platforms.filter((p) => allowed.has(p));
  if (!platforms.length) {
    db.prepare("UPDATE schedules SET status = 'failed', note = 'Platform tidak valid' WHERE id = ?").run(s.id);
    return;
  }

  const d = disclosure(db);
  const hook = content.hook || "";
  const caption = content.caption || "";
  const hashtags = content.hashtags || "";
  const link = product.affiliate_link || "";

  // Validasi kebutuhan per platform.
  if (platforms.includes("instagram") && !content.media_path) {
    db.prepare("UPDATE schedules SET status = 'failed', note = 'Instagram butuh gambar' WHERE id = ?").run(s.id);
    return;
  }
  const pageId = fbPageId(db, process.env.FB_PAGE_ID || "");
  if (platforms.includes("facebook_page") && !pageId) {
    db.prepare("UPDATE schedules SET status = 'failed', note = 'FB_PAGE_ID belum diisi (lihat Pengaturan)' WHERE id = ?").run(s.id);
    return;
  }

  // Susun text: gunakan varian threads bila threads termasuk; bila multi-platform,
  // kirim text gabungan facebook-style (hook+caption+link) — social-poster memotong per platform.
  let text;
  if (platforms.length === 1 && platforms[0] === "threads") {
    text = buildThreadsText(caption, link, d);
  } else if (platforms.length === 1 && platforms[0] === "instagram") {
    const t = `${hook}\n\n${caption}\n\n${hashtags}`.trim();
    const full = withDisclosure(t, d);
    text = full.length > 2200 ? full.slice(0, 2200).trimEnd() : full;
  } else {
    text = withDisclosure(`${hook}\n\n${caption}\n\n${link}`.trim(), d);
  }

  // Upload media bila ada & platform butuh (instagram / facebook_page).
  let mediaIds;
  if (content.media_path && (platforms.includes("instagram") || platforms.includes("facebook_page"))) {
    const local = path.join(process.cwd(), "data", "media", path.basename(content.media_path));
    if (!fs.existsSync(local)) {
      if (platforms.includes("instagram")) {
        db.prepare("UPDATE schedules SET status = 'failed', note = 'File gambar tidak ditemukan' WHERE id = ?").run(s.id);
        return;
      }
    } else {
      const buf = fs.readFileSync(local);
      const b64 = buf.toString("base64");
      const filename = path.basename(content.media_path);
      if (opts.uploadFn) {
        const mid = await opts.uploadFn({ filename, data_base64: b64 });
        mediaIds = [mid];
      } else {
        const upRes = await fetchTimeout(
          `${posterUrl}/api/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": posterKey },
            body: JSON.stringify({ filename, data_base64: b64 }),
          },
          30000
        );
        if (!upRes.ok) {
          const t = await upRes.text().catch(() => "");
          throw new Error(`Upload media gagal (HTTP ${upRes.status}): ${t.slice(0, 200)}`);
        }
        const upData = await upRes.json();
        const mid = upData.media_id || upData.id;
        if (!mid) throw new Error("Upload media: respons tanpa media_id");
        mediaIds = [mid];
      }
    }
  }

  const body = { text, platforms, ...(mediaIds ? { media_ids: mediaIds } : {}) };
  if (platforms.includes("facebook_page") && pageId) {
    body.options = { page_id: pageId };
  }

  let jobId = null;
  if (opts.postFn) {
    jobId = await opts.postFn(body);
  } else {
    const postRes = await fetchTimeout(
      `${posterUrl}/api/post`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": posterKey },
        body: JSON.stringify(body),
      },
      30000
    );
    if (!postRes.ok) {
      const t = await postRes.text().catch(() => "");
      throw new Error(`Social-poster HTTP ${postRes.status}: ${t.slice(0, 300)}`);
    }
    const postData = await postRes.json().catch(() => ({}));
    jobId = postData.job_id || postData.id || null;
  }

  db.prepare("UPDATE schedules SET status = 'sent', job_id = ?, note = NULL WHERE id = ?").run(
    jobId ? String(jobId) : null,
    s.id
  );
  log("info", `jadwal ${s.id} terkirim`, { job_id: jobId });
}

/** Saat boot: tandai processing basi (>10 mnt) sebagai failed. */
function markInterruptedOnBoot(db) {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const info = db
    .prepare(
      "UPDATE schedules SET status = 'failed', note = 'terputus saat proses, cek Antrean sebelum jadwalkan ulang' WHERE status = 'processing' AND (locked_at IS NULL OR locked_at <= ?)"
    )
    .run(cutoff);
  if (info.changes > 0) log("warn", `${info.changes} jadwal processing basi ditandai failed`);
  return info.changes;
}

/** Backup harian via VACUUM INTO (aman saat DB dipakai). Simpan 7 terakhir, chmod 600. */
function runBackup(db) {
  const dir = path.join(process.cwd(), "data", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const dest = path.join(dir, `affiliate-${stamp}.db`);
  // Hindari nama file aneh: validasi stamp numerik.
  if (!/^\d{8}$/.test(stamp)) return;
  try {
    db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
    try {
      fs.chmodSync(dest, 0o600);
    } catch { /* abaikan */ }
    const files = fs
      .readdirSync(dir)
      .filter((f) => /^affiliate-\d{8}\.db$/.test(f))
      .sort();
    while (files.length > 7) {
      const old = files.shift();
      try {
        fs.unlinkSync(path.join(dir, old));
      } catch { /* abaikan */ }
    }
    log("info", `backup selesai: ${path.basename(dest)}`);
  } catch (e) {
    log("error", `backup gagal: ${e.message}`);
  }
}

/** Retensi harian: hapus media tak direferensikan + jadwal sent/failed > 90 hari. */
function runRetention(db) {
  try {
    const rows = db.prepare("SELECT DISTINCT media_path FROM contents WHERE media_path IS NOT NULL").all();
    const used = new Set(rows.map((r) => r.media_path).filter(Boolean).map((p) => path.basename(String(p))));
    const mediaDir = path.join(process.cwd(), "data", "media");
    if (fs.existsSync(mediaDir)) {
      for (const f of fs.readdirSync(mediaDir)) {
        if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(f)) continue;
        if (!used.has(f)) {
          try {
            fs.unlinkSync(path.join(mediaDir, f));
          } catch { /* abaikan */ }
        }
      }
    }
    const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const info = db
      .prepare("DELETE FROM schedules WHERE status IN ('sent','failed') AND created_at <= ?")
      .run(cutoff);
    log("info", `retensi: ${info.changes} jadwal lama dihapus`);
  } catch (e) {
    log("error", `retensi gagal: ${e.message}`);
  }
}

module.exports = {
  processDueSchedules,
  executeSchedule,
  markInterruptedOnBoot,
  runBackup,
  runRetention,
  buildThreadsText,
};
