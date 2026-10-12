import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { getEnv } from "./env";
import { SESSION_COOKIE, verifySessionSignature } from "./session";

/** Dipakai server component halaman terproteksi. Redirect ke /login bila belum login. */
export async function guardPage(): Promise<string> {
  let env;
  try {
    env = getEnv();
  } catch {
    redirect("/login");
  }
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) redirect("/login");
  const p = verifySessionSignature(raw, env.SESSION_SECRET);
  if (!p || p.uid !== 1) redirect("/login");
  try {
    const row = getDb().prepare("SELECT username, token_version FROM users WHERE id = 1").get() as {
      username: string;
      token_version: number;
    } | undefined;
    if (!row || row.token_version !== p.tv) redirect("/login");
    return row.username;
  } catch {
    redirect("/login");
  }
}

export function hasAnyUserSync(): boolean {
  try {
    return !!getDb().prepare("SELECT id FROM users WHERE id = 1").get();
  } catch {
    return false;
  }
}
