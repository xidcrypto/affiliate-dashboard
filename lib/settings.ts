import { getDb } from "./db";

export const SETTING_WHITELIST = ["FB_PAGE_ID", "disclosure_text", "theme"] as const;
export type SettingKey = (typeof SETTING_WHITELIST)[number];

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as {
    value: string | null;
  } | undefined;
  return row?.value ?? null;
}

export function getSettingsMap(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value ?? "";
  return out;
}

export function setSetting(key: string, value: string) {
  const db = getDb();
  db.prepare(
    "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

export function disclosureText(): string {
  return getSetting("disclosure_text") || "#affiliate";
}

export function fbPageId(fallbackEnv: string): string {
  return getSetting("FB_PAGE_ID") || fallbackEnv || "";
}
