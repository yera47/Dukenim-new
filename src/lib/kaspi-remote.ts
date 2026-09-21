export function kaspiRemoteUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port || !url.pathname.startsWith("/")) return null;
    if (url.hostname !== "kaspi.kz" && !url.hostname.endsWith(".kaspi.kz")) return null;
    return url.toString();
  } catch { return null; }
}
