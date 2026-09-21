import { z } from "zod";

// Only provider-owned HTTPS links; never render pasted HTML or fetch arbitrary URLs.
export function safeMapUrl(value: string, kind: "gis" | "yandex" | "embed") {
  if (!value) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (kind === "gis") return ["2gis.kz", "2gis.ru", "2gis.com", "go.2gis.com"].includes(url.hostname);
    if (kind === "yandex") return ["yandex.kz", "yandex.ru", "yandex.com", "yandex.uz"].includes(url.hostname) && (url.pathname === "/maps" || url.pathname.startsWith("/maps/"));
    return (url.hostname === "api-maps.yandex.ru" && url.pathname.startsWith("/frame/v1/")) ||
      (url.hostname === "yandex.ru" && url.pathname === "/map-widget/v1/");
  } catch { return false; }
}
export function normalizeMapInput(value: string, kind: "gis" | "yandex" | "embed") {
  const trimmed = value.trim();
  if (kind !== "embed" || !trimmed.startsWith("<iframe")) return trimmed;
  const src = trimmed.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  return src ? src.replace(/&amp;/g, "&") : trimmed;
}
const link = (kind: "gis" | "yandex" | "embed") => z.string().trim().max(1500).transform(v => normalizeMapInput(v,kind)).refine(v => safeMapUrl(v, kind), "Используйте HTTPS-ссылку из сервиса карт.");
export const pickupLocationSchema = z.object({
  address: z.string().trim().min(5).max(300),
  hours: z.string().trim().min(2).max(200),
  preparation: z.string().trim().min(2).max(200),
  instructions: z.string().trim().max(500),
  gisUrl: link("gis"), yandexUrl: link("yandex"), embedUrl: link("embed"),
}).strict();
export type PickupLocation = z.infer<typeof pickupLocationSchema>;
export function readPickupLocation(value: unknown): PickupLocation | null {
  const parsed = pickupLocationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
