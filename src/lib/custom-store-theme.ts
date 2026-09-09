import { z } from "zod";
import { contrastInk } from "./color-contrast";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
export const customStoreThemeSchema = z.object({ background: hex, surface: hex, accent: hex }).strict().refine(
  value => contrastInk(value.background) === contrastInk(value.surface),
  "Фон и карточки должны поддерживать один читаемый цвет текста.",
);
export type CustomStoreTheme = z.infer<typeof customStoreThemeSchema>;

function blend(color: string, target: string, amount: number) {
  return "#" + [1, 3, 5].map(i => Math.round(parseInt(color.slice(i, i + 2), 16) * (1 - amount) + parseInt(target.slice(i, i + 2), 16) * amount).toString(16).padStart(2, "0")).join("");
}

/** Variations of the owner's colours, never a substituted preset palette. */
export function themeVariations(theme: CustomStoreTheme) {
  const target = contrastInk(theme.background) === "#000000" ? "#ffffff" : "#000000";
  return [
    { name: "Исходное сочетание", theme },
    { name: "Мягче", theme: { background: blend(theme.background, target, .35), surface: blend(theme.surface, target, .25), accent: blend(theme.accent, target, .12) } },
    { name: "Выразительнее", theme: { background: blend(theme.background, target, .15), surface: blend(theme.surface, target, .45), accent: blend(theme.accent, contrastInk(theme.accent) === "#ffffff" ? "#000000" : "#ffffff", .2) } },
  ].filter(choice => customStoreThemeSchema.safeParse(choice.theme).success);
}
