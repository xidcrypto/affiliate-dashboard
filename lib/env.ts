import { z } from "zod";

const envSchema = z.object({
  SOCIAL_POSTER_URL: z.string().url().default("http://127.0.0.1:20141"),
  SOCIAL_POSTER_KEY: z.string().min(1, "SOCIAL_POSTER_KEY wajib diisi"),
  LLM_URL: z.string().url().default("http://127.0.0.1:20128/v1"),
  LLM_MODEL: z.string().min(1).default("musebridge/muse"),
  FB_PAGE_ID: z.string().default(""),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET minimal 32 karakter (buat dengan: openssl rand -hex 32)"),
  SETUP_TOKEN: z.string().default(""),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(20142),
  BASE_PATH: z.string().default(""),
  TRUST_PROXY: z
    .string()
    .default("true")
    .transform((v) => v.toLowerCase() === "true"),
  ALLOWED_ORIGIN: z.string().default(""),
  NODE_ENV: z.string().default("development"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msgs = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    // Jangan bocorkan nilai secret — hanya nama field + pesan.
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "fatal",
        msg: `Konfigurasi env tidak valid: ${msgs}`,
      })
    );
    throw new Error(`Konfigurasi env tidak valid: ${msgs}`);
  }
  cached = parsed.data;
  return cached;
}

/** Validasi saat boot; gagal -> throw agar proses exit dengan pesan jelas. */
export function validateEnvOrThrow(): AppEnv {
  return getEnv();
}
