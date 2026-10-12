import { randomBytes, timingSafeEqual, type BinaryLike } from "node:crypto";
import { promisify } from "node:util";
import { scrypt as scryptCb } from "node:crypto";

// promisify manual agar options scrypt (N, r, p) lolos types @types/node baru.
function scryptAsync(password: BinaryLike, salt: BinaryLike, keylen: number): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCb(
      password,
      salt,
      keylen,
      { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 },
      (err, derived) => {
        if (err) reject(err);
        else resolve(derived as Buffer);
      }
    );
  });
}
void promisify;
const N = 16384;
const R = 8;
const P = 1;
const SALT_LEN = 16;
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const derived = await scryptAsync(password, salt, KEY_LEN);
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/** Dummy hash untuk anti user-enumeration timing saat username tidak ada. */
export async function dummyVerify(): Promise<void> {
  const salt = Buffer.alloc(SALT_LEN, 0);
  try {
    await scryptAsync("dummy-password-anti-enumeration", salt, KEY_LEN);
  } catch {
    /* abaikan */
  }
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const salt = Buffer.from(parts[4], "hex");
    const expected = Buffer.from(parts[5], "hex");
    if (salt.length !== SALT_LEN || expected.length !== KEY_LEN) return false;
    const derived = await scryptAsync(password, salt, KEY_LEN);
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
