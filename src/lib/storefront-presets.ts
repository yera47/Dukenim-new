import type { BusinessVertical } from "@/types/database";

export const storefrontFamilies = ["visual", "quick"] as const;
export type StorefrontFamily = (typeof storefrontFamilies)[number];
export type StorefrontPreset = {
  family: StorefrontFamily;
  label: string;
  templateKey: "atelier" | "studio" | "gallery" | "market";
  paletteKey: "clay-milk" | "paper-forest" | "plum-stone" | "ocean-sand" | "cobalt-cloud" | "cherry-cream" | "mono";
  summary: string;
  rule: string;
};

type PresetPair = readonly [
  Omit<StorefrontPreset, "family">,
  Omit<StorefrontPreset, "family">,
];

const presets: Partial<Record<BusinessVertical, PresetPair>> = {
  fashion: [
    { label: "Коллекция и образы", templateKey: "atelier", paletteKey: "clay-milk", summary: "Крупные фотографии, подборки и заметная сезонная коллекция.", rule: "Варианты размера и цвета показываются в карточке товара." },
    { label: "Размеры и наличие", templateKey: "market", paletteKey: "mono", summary: "Компактный каталог: цена, варианты и остаток видны сразу.", rule: "Подходит широкому ассортименту и повторным заказам." },
  ],
  food: [
    { label: "Фото-меню", templateKey: "gallery", paletteKey: "cherry-cream", summary: "Фотографии блюд, ясные разделы и заметные позиции меню.", rule: "Пример Bulka относится только к еде; это пример оформления, не подключённая услуга." },
    { label: "Быстрый заказ", templateKey: "market", paletteKey: "mono", summary: "Разделы меню, доступные варианты и короткий путь к повторному заказу.", rule: "Состав, опции и наличие берутся из каталога магазина." },
  ],
  home: [
    { label: "Интерьерная коллекция", templateKey: "atelier", paletteKey: "ocean-sand", summary: "Предметы показаны в интерьерных подборках с крупными фото.", rule: "Размеры, материалы и цена остаются в карточке реального товара." },
    { label: "По комнатам и наличию", templateKey: "market", paletteKey: "paper-forest", summary: "Покупатель быстро открывает нужную комнату, категорию и наличие.", rule: "Не показываем вымышленные сроки поставки или остатки." },
  ],
  beauty: [
    { label: "Редакционная подборка", templateKey: "studio", paletteKey: "plum-stone", summary: "Спокойная фотоподача средств и простые категории ухода.", rule: "Описание не создаёт медицинских обещаний и не меняет данные товара." },
    { label: "Уход по категориям", templateKey: "market", paletteKey: "cobalt-cloud", summary: "Категории, цена и выбранные покупателем варианты рядом.", rule: "Назначение и состав показываются только из карточки магазина." },
  ],
  flowers: [
    { label: "Сезонная цветочная коллекция", templateKey: "atelier", paletteKey: "cherry-cream", summary: "Крупные фото букетов и понятные сезонные подборки.", rule: "Время вручения и доставка указываются магазином." },
    { label: "Букеты к событию", templateKey: "market", paletteKey: "paper-forest", summary: "Категории поводов, цена и доступность заказа на первом плане.", rule: "Показываем только сохранённые товары и условия магазина." },
  ],
  other: [
    { label: "Чистая витрина", templateKey: "studio", paletteKey: "clay-milk", summary: "Лаконичная подача, разделы и место для собственных фото.", rule: "AI предложит структуру по вашему описанию; вы проверите её до сохранения." },
    { label: "Каталог по категориям", templateKey: "market", paletteKey: "cobalt-cloud", summary: "Категории, цены, варианты и наличие — в одном коротком пути.", rule: "Состав и статусы формируются из реального каталога." },
  ],
};

export function storefrontPresetsFor(vertical: BusinessVertical): StorefrontPreset[] {
  const pair = presets[vertical] ?? presets.other!;
  return pair.map((preset, index) => ({ ...preset, family: index === 0 ? "visual" : "quick" }));
}

export function storefrontPresetForTemplate(vertical: BusinessVertical, templateKey: string) {
  return storefrontPresetsFor(vertical).find((preset) => preset.templateKey === templateKey);
}

export function storefrontPreviewHref(input: { name: string; templateKey: string; paletteKey: string; example?: boolean }) {
  const query = new URLSearchParams({ template: input.templateKey, palette: input.paletteKey, name: input.name.slice(0, 80) });
  if (input.example) query.set("content", "example");
  return `/store-preview?${query.toString()}`;
}
