import type { BusinessVertical, Database } from "@/types/database";
import { nichePresets } from "@/lib/niche-presets";
import { products, type Product } from "@/lib/demo-data";
import { demoMedia } from "@/lib/demo-media";

export const demoVerticals: BusinessVertical[] = ["fashion", "beauty", "food", "flowers", "home", "services", "event", "other"];
export function demoSlug(vertical: BusinessVertical) { return vertical === "fashion" ? "demo-shop" : `demo-${vertical}`; }
export function demoId(vertical: BusinessVertical) { return `10000000-0000-0000-0000-${String(demoVerticals.indexOf(vertical) + 1).padStart(12, "0")}`; }
export function demoVerticalById(id: string) { return demoVerticals.find((vertical) => demoId(vertical) === id); }
export function demoVerticalBySlug(slug: string) { return demoVerticals.find((vertical) => demoSlug(vertical) === slug); }

type Example = [title: string, category: string, price: number, size: string | null];
const examples: Partial<Record<BusinessVertical, Example[]>> = {
  beauty: [["Сыворотка «Баланс»", "Уход за лицом", 8500, "30 мл"], ["Восстанавливающий крем", "Уход за лицом", 12500, "50 мл"], ["Лосьон для тела", "Уход за телом", 9900, "200 мл"], ["Набор ежедневного ухода", "Наборы", 24500, null], ["Парфюмированная дымка", "Ароматы", 14500, "100 мл"]],
  food: [["Круассан с миндалём", "Завтраки", 3200, null], ["Сэндвич с сыром", "Завтраки", 2900, null], ["Кофе с молоком", "Напитки", 1400, "300 мл"], ["Завтрак на двоих", "Комбо", 8500, null], ["Зелёный салат", "Салаты", 3400, null]],
  flowers: [["Белый букет", "Монобукеты", 22000, "M"], ["Садовая композиция", "Композиции", 28500, "L"], ["Мини-букет", "Монобукеты", 12000, "S"], ["Синяя гортензия", "Цветы", 35000, "L"]],
  home: [["Настольная лампа", "Свет", 39000, "42 см"], ["Льняной плед", "Текстиль", 25000, "140 × 200 см"], ["Керамическая ваза", "Декор", 18500, "24 см"], ["Подсвечник", "Декор", 7500, "12 см"]],
  services: [["Первая консультация", "Консультации", 15000, "60 минут"], ["Разбор задачи", "Консультации", 25000, "90 минут"], ["Проектная сессия", "Сессии", 40000, "2 часа"], ["Сопровождение", "Программы", 65000, "1 месяц"]],
  event: [["Входной билет", "Билеты", 8000, null], ["Практикум", "Практикумы", 15000, "2 часа"], ["Групповая сессия", "Сессии", 12000, "90 минут"], ["Полная программа", "Программы", 35000, "1 день"]],
  other: [["Подарочный набор «Графит»", "Аксессуары", 24900, "комплект"], ["Подарочный набор «Песок»", "Аксессуары", 14900, "комплект"], ["Ручка Line", "Инструменты", 1500, "0,5 мм"], ["Дорожный органайзер", "Аксессуары", 2500, null]],
};

const fashionCopy: Record<string, Pick<Product, "title" | "description" | "category">> = {
  p1: { title: "Жакет Essential", description: "Структурный жакет из плотной костюмной ткани.", category: "Жакеты" },
  p2: { title: "Платье Line", description: "Минималистичное платье миди с мягким силуэтом.", category: "Платья" },
  p3: { title: "Брюки Wide", description: "Широкие брюки с высокой посадкой.", category: "Брюки" },
  p4: { title: "Рубашка Air", description: "Лёгкая хлопковая рубашка прямого кроя.", category: "Рубашки" },
  p5: { title: "Свитер Soft", description: "Мягкий трикотаж свободного силуэта.", category: "Трикотаж" },
  p6: { title: "Кеды Everyday", description: "Лаконичные кеды для городского гардероба.", category: "Обувь" },
  p7: { title: "Сумка Daily", description: "Компактная сумка из гладкой кожи.", category: "Аксессуары" },
  p8: { title: "Футболка Base", description: "Плотный хлопок и свободная посадка.", category: "Трикотаж" },
  p9: { title: "Тренч City", description: "Лёгкий тренч прямого силуэта.", category: "Верхняя одежда" },
  p10: { title: "Джинсы Straight", description: "Прямые джинсы из плотного денима.", category: "Джинсы" },
};

export function demoProductsFor(vertical: BusinessVertical): Product[] {
  if (vertical === "fashion") return products.map((product) => ({ ...product, ...fashionCopy[product.id], variants: product.variants.map((variant, index) => ({ ...variant, size: variant.size || ["S", "M", "L"][index % 3] })) }));
  const preset = nichePresets[vertical];
  return (examples[vertical] ?? []).map(([title, category, price, size], index) => ({
    id: `${vertical}-${index + 1}`, title, category, price,
    foodOptions: vertical === "food" ? (index === 0 ? { ingredients: [{ id: "cucumber", name: "Огурец", removable: true }, { id: "salad", name: "Салат", removable: true }, { id: "croissant", name: "Круассан", removable: false }], groups: [{ id: "extras", title: "Добавить к заказу", kind: "addon", min: 0, max: 2, options: [{ id: "cheese", label: "Сыр", price: 300, variantId: null }, { id: "sauce", label: "Соус", price: 150, variantId: null }] }] } : index === 3 ? { ingredients: [], groups: [{ id: "drink", title: "Напиток в комбо", kind: "combo", min: 1, max: 1, options: [{ id: "coffee", label: "Кофе с молоком", price: 0, variantId: "food-v3" }] }, { id: "breakfast", title: "Основное блюдо", kind: "combo", min: 1, max: 1, options: [{ id: "croissant", label: "Круассан с миндалём", price: 300, variantId: "food-v1" }, { id: "sandwich", label: "Сэндвич с сыром", price: 0, variantId: "food-v2" }] }] } : undefined) : undefined,
    description: vertical === "home" ? "Синтетическая демо-позиция: материалы и размеры указаны для проверки карточки." : "Синтетическая демо-позиция для проверки витрины Dukenim.",
    images: demoMedia[`${vertical}-${index + 1}`] ? [demoMedia[`${vertical}-${index + 1}`]] : index === 0 && preset.imageUrl ? [preset.imageUrl] : [],
    featured: index === 0,
    variants: [{ id: `${vertical}-v${index + 1}`, size, color: vertical === "flowers" ? "Как на фото" : vertical === "home" ? ["Керамика", "Лён", "Керамика", "Металл"][index] : "Основной", stock: 10 }],
  }));
}

type StorefrontSettings = Database["public"]["Tables"]["tenant_storefront_settings"]["Row"];
export const redChocoberryDemoSettings: StorefrontSettings = { tenant_id: demoId("flowers"), template_key: "gallery", palette_key: "cherry-cream", brand_color: "#8B2D55", color_theme: { background: "#FFF8F3", surface: "#FFFDF9", accent: "#9B315D" }, layout_config: { typography: "editorial", hero: "editorial", density: "airy", columns: 4, corners: "rounded", imageRatio: "portrait" }, hero_title: "Цветы для важных моментов", hero_subtitle: "Свежие букеты, собранные с вниманием к каждой детали.", hero_image_url: demoMedia["flowers-2"], hero_cta_label: "Выбрать букет", updated_at: "2026-10-01T00:00:00.000Z" };
export const bulkaDemoSettings: StorefrontSettings = { tenant_id: demoId("food"), template_key: "gallery", palette_key: "clay-milk", brand_color: "#F59B14", color_theme: { background: "#FFF7E8", surface: "#FFFCF5", accent: "#F59B14" }, layout_config: { typography: "modern", hero: "editorial", density: "compact", columns: 4, corners: "rounded", imageRatio: "landscape" }, hero_title: "Свежая выпечка рядом", hero_subtitle: "Тёплый хлеб и любимая выпечка — каждый день.", hero_image_url: demoMedia["food-1"], hero_cta_label: "Выбрать выпечку", updated_at: "2026-10-01T00:00:00.000Z" };

// Approved boards guide only synthetic demos; real tenants retain their own content.
export const approvedConceptDemoNames: Partial<Record<BusinessVertical, string>> = { fashion: "FORMA", beauty: "SOMA", flowers: "VETKA", home: "ТИХО", other: "БЮРО" };
export const approvedConceptDemoSettings: Partial<Record<BusinessVertical, StorefrontSettings>> = {
  fashion: { tenant_id: demoId("fashion"), template_key: "atelier", palette_key: "mono", brand_color: "#111111", color_theme: { background: "#F7F5F1", surface: "#FFFFFF", accent: "#111111" }, layout_config: { typography: "modern", hero: "editorial", density: "compact", columns: 3, corners: "square", imageRatio: "portrait" }, hero_title: "Форма вашего дня", hero_subtitle: "Выверенный крой, фактура и свобода для визуального ритма.", hero_image_url: null, hero_cta_label: "Смотреть коллекцию", updated_at: "2026-10-05T00:00:00.000Z" },
  beauty: { tenant_id: demoId("beauty"), template_key: "atelier", palette_key: "cherry-cream", brand_color: "#7D151B", color_theme: { background: "#FBF1EB", surface: "#FFF9F5", accent: "#7D151B" }, layout_config: { typography: "editorial", hero: "editorial", density: "balanced", columns: 3, corners: "soft", imageRatio: "portrait" }, hero_title: "Тихий ритуал", hero_subtitle: "Формулы, текстуры и ежедневные привычки ухода.", hero_image_url: demoMedia["beauty-2"], hero_cta_label: "Выбрать уход", updated_at: "2026-10-05T00:00:00.000Z" },
  flowers: { tenant_id: demoId("flowers"), template_key: "atelier", palette_key: "cobalt-cloud", brand_color: "#0B43A4", color_theme: { background: "#FAF7EF", surface: "#FFFCF6", accent: "#0B43A4" }, layout_config: { typography: "editorial", hero: "editorial", density: "balanced", columns: 3, corners: "square", imageRatio: "portrait" }, hero_title: "Цветы говорят сами", hero_subtitle: "Букеты сегодня — без лишних слов.", hero_image_url: demoMedia["flowers-2"], hero_cta_label: "Выбрать букет", updated_at: "2026-10-05T00:00:00.000Z" },
  home: { tenant_id: demoId("home"), template_key: "atelier", palette_key: "clay-milk", brand_color: "#33261C", color_theme: { background: "#F5F0E7", surface: "#FFFDF8", accent: "#33261C" }, layout_config: { typography: "editorial", hero: "editorial", density: "balanced", columns: 3, corners: "square", imageRatio: "landscape" }, hero_title: "Тише дома", hero_subtitle: "Вещи, рядом с которыми дом становится вашим.", hero_image_url: demoMedia["home-2"], hero_cta_label: "Смотреть предметы", updated_at: "2026-10-05T00:00:00.000Z" },
  other: { tenant_id: demoId("other"), template_key: "atelier", palette_key: "cobalt-cloud", brand_color: "#0751C7", color_theme: { background: "#FFFFFF", surface: "#F5F5F3", accent: "#0751C7" }, layout_config: { typography: "technical", hero: "editorial", density: "compact", columns: 2, corners: "square", imageRatio: "landscape" }, hero_title: "Соберите свой ритм", hero_subtitle: "Предметы для дел, идей и порядка.", hero_image_url: demoMedia["other-2"], hero_cta_label: "Открыть каталог", updated_at: "2026-10-05T00:00:00.000Z" },
};
