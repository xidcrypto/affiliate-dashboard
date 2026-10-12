# Affiliate Poster Dashboard

Dashboard affiliate full-stack (Next.js 16 + SQLite): input produk via web → AI menulis
hook/caption/hashtag realtime → review → jadwalkan → auto-post ke IG/FB/Threads lewat
API social-poster.

Catatan versi: memakai `next@latest` (saat ini 16.x). `serverExternalPackages`
pengganti `experimental.serverComponentsExternalPackages` yang deprecated/dihapus di
Next 15/16. Tidak ada dependency di luar daftar AGENTS.md (next, react, better-sqlite3,
node-cron, zod, lucide-react, clsx) — semua kebutuhan lain memakai bawaan Node/Next.

## 1. Instalasi

```bash
# Node 22 dianjurkan (lihat .nvmrc bila ada)
cp .env.example .env
chmod 600 .env
# isi SESSION_SECRET (openssl rand -hex 32), SETUP_TOKEN (openssl rand -hex 16),
# SOCIAL_POSTER_KEY, ALLOWED_ORIGIN
npm ci
npm run build
```

Jalankan:

```bash
node server.js
# -> http://127.0.0.1:20142 (bind localhost saja)
```

Setup akun pertama: buka `/setup`, masukkan `SETUP_TOKEN` + username + password.
**Setelah akun dibuat: hapus `SETUP_TOKEN` dari `.env`** (halaman & API setup jadi 404).

## 2. Environment

Lihat `.env.example`. Aturan:

- `SESSION_SECRET` minimal 32 karakter — app **menolak start** bila kosong/pendek.
- `SOCIAL_POSTER_KEY` & `SESSION_SECRET` hanya dari env: tidak disimpan ke DB,
  tidak dikirim ke browser, tidak masuk log (semua log lewat `redact()`).
- `chmod 600 .env`.

## 3. Build & service

```bash
npm run build        # NODE_OPTIONS=--max-old-space-size=1536 (aman VPS 2 GB)
npm run db:backup    # backup manual ke data/backups/
node server.js       # custom server next + cron
```

systemd (non-root, lihat `deploy/affiliate-web.service`):

```bash
sudo cp deploy/affiliate-web.service /etc/systemd/system/affiliate-web.service
sudo systemctl daemon-reload
sudo systemctl enable --now affiliate-web
```

nginx: gabungkan `deploy/nginx-affiliate.conf` ke server HTTPS yang sudah ada.
Jangan buka port 20142 ke publik. HSTS diset di nginx. Cookie `__Host-aff_sess`
wajib `Secure` — hanya jalan di HTTPS atau localhost.

## 4. Backup & restore

- Otomatis tiap 03:00 WIB (`VACUUM INTO`) ke `data/backups/affiliate-YYYYMMDD.db`,
  simpan 7 terakhir, permission `600`. Sekaligus menjalankan retensi (hapus media
  tak direferensikan + jadwal `sent/failed` > 90 hari).
- Restore: hentikan service, `cp data/backups/affiliate-YYYYMMDD.db data/affiliate.db`,
  start lagi.

## 5. Rotasi secret

- `SOCIAL_POSTER_KEY`: ganti di `.env` + restart service.
- `SESSION_SECRET`: ganti di `.env` + restart — **semua sesi logout**.
- Password admin: via Pengaturan → Ganti password (sesi lain langsung mati via
  `token_version++`). Tidak ada reset via email — bila lupa, buat ulang via DB
  langsung di server (butuh akses shell).

## 6. Checklist keamanan

- [ ] `.env` chmod 600, milik user `affiliate`
- [ ] `SETUP_TOKEN` dihapus setelah akun dibuat
- [ ] Port 20142 hanya listen 127.0.0.1 (cek: `ss -ltn`)
- [ ] HTTPS aktif di nginx; cookie `__Host-`/`Secure` valid
- [ ] `ALLOWED_ORIGIN` = domain publik persis (tanpa trailing slash)
- [ ] Tidak ada secret di log/build output (cek: `grep -ri "api-key\|secret" .next/server 2>/dev/null | head`)
- [ ] Backup berjalan (cek `data/backups/`)
- [ ] `npm audit --omit=dev` dicek berkala

## 7. Cara pakai

1. Buka dashboard → tambah produk (nama + link affiliate + harga + foto).
2. Klik Generate ⚡ — AI memproses realtime: hook, caption, hashtag jadi ±15 detik.
3. Review/edit (lihat pratinjau postingan) → Jadwalkan (platform + waktu).
4. Jadwal dieksekusi otomatis; tap 1x persetujuan di aplikasi saat kartunya
   muncul → terkirim ke IG/FB/Threads.
5. Pantau di halaman Antrean.

Catatan: pendaftaran akun affiliate (Shopee/TikTok) dilakukan pemilik sendiri.
Cantumkan label iklan/affiliate di setiap postingan sesuai aturan platform
(default `#affiliate`, bisa diubah di Pengaturan).
