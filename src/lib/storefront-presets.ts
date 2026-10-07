import type { BusinessVertical } from "@/types/database";

export const storefrontFamilies = ["warm", "soft", "crisp"] as const;
export type StorefrontFamily = (typeof storefrontFamilies)[number];

export type StorefrontPreset = {
  family: StorefrontFamily;
  label: string;
  templateKey: "gallery" | "studio" | "market";
  paletteKey: "clay-milk" | "paper-forest" | "plum-stone" | "ocean-sand" | "cobalt-cloud" | "cherry-cream" | "mono";
  summary: string;
  rule: string;
};

const palettes: Partial<Record<BusinessVertical, readonly [StorefrontPreset["paletteKey"], StorefrontPreset["paletteKey"], StorefrontPreset["paletteKey"]]>> = {
  fashion: ["clay-milk", "plum-stone", "mono"],
  beauty: ["plum-stone", "paper-forest", "cobalt-cloud"],
  food: ["clay-milk", "cherry-cream", "mono"],
  flowers: ["cherry-cream", "paper-forest", "plum-stone"],
  home: ["clay-milk", "paper-forest", "ocean-sand"],
  other: ["clay-milk", "paper-forest", "cobalt-cloud"],
};

export function storefrontPresetsFor(vertical: BusinessVertical): StorefrontPreset[] {
  const [warm, soft, crisp] = palettes[vertical] ?? palettes.other!;
  return [
    {
      family: "warm",
      label: "Тёплый",
      templateKey: "gallery",
      paletteKey: warm,
      summary: "Эмоциональная обложка, крупные реальные фотографии и спокойная сетка товаров.",
      rule: "Лучше для небольшого визуального ассортимента. Товар показывается только фотографией продавца.",
    },
    {
      family: "soft",
      label: "Мягкий",
      templateKey: "studio",
      paletteKey: soft,
      summary: "Сначала понятные разделы, затем товары — мягкие цвета и больше воздуха.",
      rule: "Лучше, когда покупателю проще начать с категории. Никаких выдуманных рекомендаций или свойств.",
    },
    {
      family: "crisp",
      label: "Чёткий",
      templateKey: "market",
      paletteKey: crisp,
      summary: "Категории, цена, варианты и наличие сразу — быстрый путь к корзине.",
      rule: "Лучше для широкого каталога и повторных заказов. Контраст и данные важнее декора.",
    },
  ];
}

export function storefrontPresetForTemplate(vertical: BusinessVertical, templateKey: string) {
  return storefrontPresetsFor(vertical).find((preset) => preset.templateKey === templateKey);
}

export function storefrontPreviewHref(input: { name: string; templateKey: string; paletteKey: string; example?: boolean }) {
  const query = new URLSearchParams({
    template: input.templateKey,
    palette: input.paletteKey,
    name: input.name.slice(0, 80),
  });
  if (input.example) query.set("content", "example");
  return `/store-preview?${query.toString()}`;
}
