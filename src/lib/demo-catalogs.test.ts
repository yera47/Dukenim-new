import { describe, expect, it } from "vitest";
import { approvedConceptDemoSettings, bulkaDemoSettings, demoVerticals, demoId, demoSlug, demoVerticalById, demoVerticalBySlug, demoProductsFor, redChocoberryDemoSettings } from "./demo-catalogs";

describe("demo storefronts", () => {
  it("has independent, reversible identities for every business", () => {
    expect(new Set(demoVerticals.map(demoId)).size).toBe(demoVerticals.length);
    for (const vertical of demoVerticals) {
      expect(demoVerticalById(demoId(vertical))).toBe(vertical);
      expect(demoVerticalBySlug(demoSlug(vertical))).toBe(vertical);
      expect(demoProductsFor(vertical).length).toBeGreaterThan(0);
    }
    expect(demoVerticalBySlug("customer-store")).toBeUndefined();
  });
  it("has ten distinct fashion products and photographs", () => {
    const products = demoProductsFor("fashion");
    expect(products.length).toBeGreaterThanOrEqual(10);
    expect(new Set(products.map(p => p.id)).size).toBe(products.length);
    expect(new Set(products.map(p => p.images?.[0])).size).toBe(products.length);
    expect(products.every(p => Number.isInteger(p.price) && p.price > 0)).toBe(true);
    expect(products.find((product) => product.id === "p1")).toMatchObject({ title: "Жакет Essential", category: "Жакеты" });
    expect(products.find((product) => product.id === "p2")).toMatchObject({ title: "Платье Line", category: "Платья" });
    expect(products.find((product) => product.id === "p5")).toMatchObject({ title: "Свитер Soft", category: "Трикотаж" });
    expect(products.find((product) => product.id === "p6")).toMatchObject({ title: "Кеды Everyday", category: "Обувь" });
    expect(products.find((product) => product.id === "p9")).toMatchObject({ title: "Тренч City", category: "Верхняя одежда" });
  });
  it("does not reuse fashion product identifiers in other demos", () => {
    const fashionIds = new Set(demoProductsFor("fashion").map(p => p.id));
    for (const vertical of demoVerticals.filter(v => v !== "fashion")) {
      expect(demoProductsFor(vertical).some(p => fashionIds.has(p.id))).toBe(false);
    }
  });
  it("covers every demo offering with a distinct illustration", () => {
    for (const vertical of demoVerticals) {
      const items = demoProductsFor(vertical);
      expect(items.every(item => Boolean(item.images?.[0])), vertical).toBe(true);
      expect(new Set(items.map(item => item.images?.[0])).size, vertical).toBe(items.length);
    }
  });
  it("keeps the local reference fixture on the shared persisted-settings shape", () => {
    expect(redChocoberryDemoSettings.tenant_id).toBe(demoId("flowers"));
    expect(redChocoberryDemoSettings.color_theme).toEqual({
      background: "#FFF8F3",
      surface: "#FFFDF9",
      accent: "#9B315D",
    });
    expect(redChocoberryDemoSettings.brand_color).toBe("#8B2D55");
    expect(redChocoberryDemoSettings.layout_config).toMatchObject({
      typography: "editorial",
      hero: "editorial",
      density: "airy",
      columns: 4,
      imageRatio: "portrait",
    });
  });
  it("keeps Bulka as an explicitly synthetic contrasting fixture", () => {
    expect(bulkaDemoSettings.color_theme).toEqual({ background: "#FFF7E8", surface: "#FFFCF5", accent: "#F59B14" });
    expect(bulkaDemoSettings.layout_config).toMatchObject({ typography: "modern", corners: "rounded" });
  });
  it("keeps all five approved non-food boards visually distinct", () => {
    const settings = ["fashion", "beauty", "flowers", "home", "other"].map((vertical) => approvedConceptDemoSettings[vertical as keyof typeof approvedConceptDemoSettings]!);
    expect(settings.every(Boolean)).toBe(true);
    expect(new Set(settings.map((item) => item.brand_color)).size).toBe(5);
    expect(new Set(settings.map((item) => item.hero_title)).size).toBe(5);
    expect(settings.every((item) => item.layout_config && item.hero_cta_label)).toBe(true);
  });
  it("provides niche-specific selectable measurements", () => {
    expect(demoProductsFor("fashion").some((item) => item.variants.some((variant) => variant.size === "S"))).toBe(true);
    expect(demoProductsFor("beauty").every((item) => item.variants.some((variant) => variant.size === null || variant.size?.includes("мл")))).toBe(true);
    expect(demoProductsFor("home").every((item) => item.variants.some((variant) => variant.size?.includes("см")))).toBe(true);
  });
});
