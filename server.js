// Custom server: Next.js + node-cron dalam satu proses.
const { createServer } = require("node:http");
const next = require("next");
const cron = require("node-cron");
const Database = require("better-sqlite3");
const fs = require("node:fs");
const path = require("node:path");
const { z } = require("zod");

const sched = require("./scheduler-core");

// --- Validasi env (gagal -> exit dengan pesan jelas) ---
const envSchema = z.object({
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET minimal 32 karakter"),
  SOCIAL_POSTER_KEY: z.string().min(1),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().default(20142),
  SOCIAL_POSTER_URL: z.string().default("http://127.0.0.1:20141"),
  FB_PAGE_ID: z.string().default(""),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msgs = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: "fatal", msg: `Env tidak valid: ${msgs}` }));
    process.exit(1);
  }
  return parsed.data;
}

const env = loadEnv();
const dev = process.env.NODE_ENV !== "production";
const hostname = env.HOST || "127.0.0.1";
const port = env.PORT || 20142;

// --- DB ---
function dataDir() {
  return path.join(process.cwd(), "data");
}
function openDb() {
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, "media"), { recursive: true });
  fs.mkdirSync(path.join(dir, "backups"), { recursive: true });
  const db = new Database(path.join(dir, "affiliate.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(`
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) <= 200),
  url TEXT, price TEXT, original_price TEXT,
  image_url TEXT, rating TEXT, sold_count TEXT,
  affiliate_link TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS contents(
  id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL,
  hook TEXT, caption TEXT, hashtags TEXT, cta TEXT,
  media_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS schedules(
  id INTEGER PRIMARY KEY AUTOINCREMENT, content_id INTEGER NOT NULL,
  platforms TEXT NOT NULL,
  publish_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_at TEXT,
  job_id TEXT, note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(content_id) REFERENCES contents(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sched_due ON schedules(status, publish_at);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
  `);
  return db;
}

const db = openDb();
sched.markInterruptedOnBoot(db);

const app = next({ dev, dir: process.cwd() });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Cron tiap 1 menit — guard anti-ganda saat hot-reload.
  if (!globalThis.__cronStarted) {
    globalThis.__cronStarted = true;
    cron.schedule("* * * * *", async () => {
      try {
        await sched.processDueSchedules(db, {
          posterUrl: env.SOCIAL_POSTER_URL,
          posterKey: env.SOCIAL_POSTER_KEY,
        });
      } catch (e) {
        console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", msg: `scheduler error: ${(e && e.message) || e}` }));
      }
    });
    // Backup harian 03:00 WIB = 20:00 UTC (server diasumsikan UTC).
    cron.schedule("0 20 * * *", () => {
      sched.runBackup(db);
      sched.runRetention(db);
    });
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", msg: "cron scheduler aktif (tiap 1 menit)" }));
  }

  const server = createServer((req, res) => handle(req, res));
  // Bind HANYA ke HOST (default 127.0.0.1), bukan 0.0.0.0.
  server.listen(port, hostname, () => {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", msg: `siap di http://${hostname}:${port}` }));
  });

  const shutdown = () => {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", msg: "shutdown..." }));
    try {
      const tasks = cron.getTasks();
      if (tasks && typeof tasks.forEach === "function") tasks.forEach((t) => t.stop());
      else if (Array.isArray(tasks)) tasks.forEach((t) => t.stop && t.stop());
    } catch { /* abaikan */ }
    try {
      server.close();
    } catch { /* abaikan */ }
    try {
      db.close();
    } catch { /* abaikan */ }
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
});
