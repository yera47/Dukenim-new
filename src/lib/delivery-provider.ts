export function deliveryProviderFromSnapshot(value: unknown): "own" | "yandex" | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("zone" in value)) return null;
  const zone = value.zone;
  if (!zone || typeof zone !== "object" || Array.isArray(zone) || !("provider" in zone)) return null;
  return zone.provider === "yandex" ? "yandex" : zone.provider === "own" ? "own" : null;
}
