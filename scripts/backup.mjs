// npm run db:backup — backup manual via VACUUM INTO.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data");
const backups = path.join(dir, "backups");
fs.mkdirSync(backups, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const dest = path.join(backups, `affiliate-${stamp}.db`);
const db = new Database(path.join(dir, "affiliate.db"));
db.pragma("journal_mode = WAL");
db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
try {
  fs.chmodSync(dest, 0o600);
} catch {}
db.close();
console.log(`backup: ${dest}`);
