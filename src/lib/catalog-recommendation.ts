import { palettes } from "./storefront-theme";

export function catalogRecommendation(value: unknown, allowedTemplates: readonly string[]) {
  if (!value || typeof value !== "object") return null;
  const design = value as Record<string, unknown>;
  if (typeof design.templateKey !== "string" || !allowedTemplates.includes(design.templateKey)) return null;
  if (typeof design.paletteKey !== "string" || !palettes.some(p => p.key === design.paletteKey)) return null;
  return { templateKey: design.templateKey, paletteKey: design.paletteKey, reason: typeof design.rationale === "string" ? design.rationale.slice(0, 600) : "Оформление подобрано по вашему описанию." };
}
