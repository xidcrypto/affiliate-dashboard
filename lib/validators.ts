import { z } from "zod";

const httpUrl = z
  .string()
  .max(2000)
  .refine(
    (v) => {
      if (!v) return true;
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL harus http(s) yang valid" }
  );

export const productCreateSchema = z
  .strictObject({
    name: z.string().min(1, "Nama wajib diisi").max(200),
    affiliate_link: httpUrl.refine((v) => !!v, { message: "Link affiliate wajib diisi" }),
    url: httpUrl.optional().default(""),
    price: z.string().max(100).default(""),
    original_price: z.string().max(100).default(""),
    image_url: httpUrl.optional().default(""),
    rating: z.string().max(50).default(""),
    sold_count: z.string().max(50).default(""),
  });

export const productUpdateSchema = productCreateSchema.partial();

export const contentUpdateSchema = z
  .strictObject({
    hook: z.string().max(500).optional(),
    caption: z.string().max(2000).optional(),
    hashtags: z.string().max(500).optional(),
    cta: z.string().max(500).optional(),
    status: z.enum(["draft", "ready", "needs_review"]).optional(),
  });

const platformEnum = z.enum(["threads", "facebook", "instagram", "facebook_page"]);

export const scheduleCreateSchema = z
  .strictObject({
    content_id: z.number().int().positive(),
    platforms: z.array(platformEnum).min(1).max(4),
    publish_at: z.string().refine(
      (v) => {
        const t = Date.parse(v);
        if (Number.isNaN(t)) return false;
        const now = Date.now();
        // harus di masa depan & maks 90 hari
        return t > now && t <= now + 90 * 24 * 3600 * 1000;
      },
      { message: "publish_at harus di masa depan (maks 90 hari)" }
    ),
  });

export const settingsSaveSchema = z
  .strictObject({
    FB_PAGE_ID: z.string().max(100).optional(),
    disclosure_text: z.string().max(100).optional(),
    theme: z.enum(["dark", "light", "system"]).optional(),
  });

export const loginSchema = z.strictObject({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(128),
});

export const setupSchema = z.strictObject({
  setup_token: z.string().min(1).max(200),
  username: z.string().min(3).max(100),
  password: z.string().min(10).max(128),
  confirm_password: z.string().min(10).max(128),
});

export const changePasswordSchema = z.strictObject({
  old_password: z.string().min(1).max(128),
  new_password: z.string().min(10).max(128),
});

export const idParamSchema = z.coerce.number().int().positive();

const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "1234567890",
  "qwerty12345",
  "admin12345",
  "indonesia1",
  "changeme123",
]);

export function passwordPolicy(password: string, username: string): string | null {
  if (password.length < 10) return "Password minimal 10 karakter";
  if (password.length > 128) return "Password maksimal 128 karakter";
  if (password.toLowerCase() === username.toLowerCase()) return "Password tidak boleh sama dengan username";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "Password terlalu umum, pilih yang lebih kuat";
  return null;
}
