import { requireAuthFromRequest } from "@/lib/auth";
import { err, json } from "@/lib/api";

export async function GET(req: Request) {
  const user = requireAuthFromRequest(req);
  if (!user) return err("Belum login", 401);
  return json({ username: user.username });
}
