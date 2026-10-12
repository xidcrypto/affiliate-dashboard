import { disclosureText } from "./settings";

export type Platform = "threads" | "facebook" | "instagram" | "facebook_page";

export function withDisclosure(text: string): string {
  const d = disclosureText();
  if (!d) return text;
  if (text.includes(d)) return text;
  return `${text}\n\n${d}`;
}

export function buildThreadsText(caption: string, link: string): string {
  const base = `${caption}\n\n${link}`.trim();
  const withD = withDisclosure(base);
  if (withD.length <= 500) return withD;
  // Potong caption dari belakang; link jangan dipotong.
  const suffix = `\n\n${link}\n\n${disclosureText()}`;
  const budget = 500 - suffix.length;
  const cut = caption.slice(0, Math.max(0, budget)).trimEnd();
  return `${cut}${suffix}`;
}

export function buildFacebookText(hook: string, caption: string, link: string): string {
  return withDisclosure(`${hook}\n\n${caption}\n\n${link}`.trim());
}

export function buildInstagramText(hook: string, caption: string, hashtags: string): string {
  const t = `${hook}\n\n${caption}\n\n${hashtags}`.trim();
  const withD = withDisclosure(t);
  return withD.length > 2200 ? withD.slice(0, 2200).trimEnd() : withD;
}

export function threadCharCount(caption: string, link: string): number {
  return buildThreadsText(caption, link).length;
}
