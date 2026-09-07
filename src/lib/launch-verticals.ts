import type { BusinessVertical } from "@/types/database";

// Existing tenants retain their vertical. This list controls new onboarding,
// not historical records or the database enum.
export const launchVerticals = [
  { id: "fashion", label: "Одежда и обувь" },
  { id: "beauty", label: "Косметика и уход" },
  { id: "food", label: "Готовая еда и напитки" },
  { id: "flowers", label: "Цветы и подарки" },
  { id: "home", label: "Дом и интерьер" },
  { id: "other", label: "Другие товары" },
] as const satisfies ReadonlyArray<{ id: BusinessVertical; label: string }>;

export function isLaunchVertical(value: unknown): value is typeof launchVerticals[number]["id"] {
  return typeof value === "string" && launchVerticals.some(item => item.id === value);
}
