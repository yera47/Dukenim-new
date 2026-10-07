import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { CartProvider } from "./cart-provider";
import { StoreHome } from "./store-home";
import { demoProductsFor } from "@/lib/demo-catalogs";
import { launchVerticals } from "@/lib/launch-verticals";
import { commerceConfigurations } from "@/lib/commerce-configurations";

vi.mock("./catalog-browser", () => ({ CatalogBrowser: () => null }));
vi.mock("@/components/store/catalog-browser", () => ({ CatalogBrowser: () => null }));
afterEach(() => vi.unstubAllGlobals());

it.each(["compact", "centered", "editorial"] as const)("renders persisted personal %s layout through the common renderer", (hero) => {
  vi.stubGlobal("React", React);
  const settings = { tenant_id: "test", color_theme: null, template_key: "gallery", palette_key: "mono", brand_color: null, hero_title: "Бренд", hero_subtitle: "Коллекция", hero_image_url: null, hero_cta_label: "Каталог", updated_at: "", layout_config: { typography: "editorial", hero, density: "airy", columns: 2, corners: "soft", imageRatio: "portrait" } };
  const html = renderToStaticMarkup(<CartProvider><StoreHome slug="own" tenant={{ name: "Бренд", catalog_name: null, tagline: null, business_vertical: "fashion" }} products={demoProductsFor("fashion")} settings={settings} campaign={null} storePolicies={null} /></CartProvider>);
  expect(html).toContain('data-personal="true"');
  expect(html).toContain('data-columns="2"');
  expect(html).toContain('data-typography="editorial"');
  expect(html.includes('data-template-cover="gallery"')).toBe(hero === "editorial");
});

it.each(["fashion", "beauty", "flowers", "home", "other"] as const)("puts catalog products before stories in the approved %s mobile concept", (vertical) => {
  vi.stubGlobal("React", React);
  const html = renderToStaticMarkup(<CartProvider><StoreHome slug={`approved-${vertical}`} tenant={{ name: vertical, catalog_name: vertical, tagline: null, business_vertical: vertical }} products={demoProductsFor(vertical)} settings={null} campaign={null} storePolicies={null} approach="collection" approvedConceptPreview /></CartProvider>);
  expect(html).toContain(`data-approved-concept="${vertical}"`);
  const hero = html.indexOf('id="approved-concept-title"');
  const catalog = html.indexOf('id="approved-catalog-title"');
  const stories = html.indexOf('id="approved-stories-title"');
  expect(hero).toBeGreaterThan(-1);
  expect(catalog).toBeGreaterThan(hero);
  expect(stories).toBeGreaterThan(catalog);
});

it("does not silently promote the first product image into the brand hero", () => {
  vi.stubGlobal("React", React);
  const items = demoProductsFor("fashion");
  const settings = { tenant_id: "test", color_theme: null, template_key: "atelier", palette_key: "mono", brand_color: null, hero_title: "Бренд", hero_subtitle: "Коллекция", hero_image_url: null, hero_cta_label: "Каталог", updated_at: "", layout_config: { typography: "modern", hero: "editorial", density: "compact", columns: 3, corners: "square", imageRatio: "portrait" } };
  const html = renderToStaticMarkup(<CartProvider><StoreHome slug="own" tenant={{ name: "Бренд", catalog_name: null, tagline: null, business_vertical: "fashion" }} products={items} settings={settings} campaign={null} storePolicies={null} /></CartProvider>);
  expect(html).toContain('data-hero-source="placeholder"');
  expect(html).not.toContain("figcaption");
});

it("keeps an explicitly selected brand hero", () => {
  vi.stubGlobal("React", React);
  const settings = { tenant_id: "test", color_theme: null, template_key: "atelier", palette_key: "mono", brand_color: null, hero_title: "Бренд", hero_subtitle: "Коллекция", hero_image_url: "https://example.com/selected-hero.jpg", hero_cta_label: "Каталог", updated_at: "", layout_config: { typography: "modern", hero: "editorial", density: "compact", columns: 3, corners: "square", imageRatio: "portrait" } };
  const html = renderToStaticMarkup(<CartProvider><StoreHome slug="own" tenant={{ name: "Бренд", catalog_name: null, tagline: null, business_vertical: "fashion" }} products={demoProductsFor("fashion")} settings={settings} campaign={null} storePolicies={null} /></CartProvider>);
  expect(html).toContain('data-hero-source="brand"');
  expect(html).toContain("selected-hero.jpg");
});

it.each(commerceConfigurations)("renders the configured block order for $id", (config) => {
  vi.stubGlobal("React", React);
  const html = renderToStaticMarkup(<CartProvider><StoreHome slug="example" tenant={{ name: "Dukenim Shop", catalog_name: null, tagline: null, business_vertical: config.vertical }} products={demoProductsFor(config.vertical)} settings={null} campaign={null} storePolicies={null} approach={config.approach} /></CartProvider>);
  expect(html).toContain(`data-approach="${config.approach}"`);
  expect(html.includes("storefront-hero-grid")).toBe(config.approach === "collection" && config.vertical !== "food");
  if (config.vertical === "food" && config.approach === "collection") { expect(html).toContain('aria-label="Обложка меню"'); expect(html).toContain('href="#catalog"'); expect(html).toContain("Выбрать состав: Круассан с миндалём"); }
  expect(html.includes('aria-label="Выбор раздела"')).toBe(config.approach === "guided" || (config.approach === "assortment" && config.vertical !== "food"));
});

it.each(launchVerticals)("renders shared example imagery and readable CTA for $id", ({ id }) => {
  vi.stubGlobal("React", React);
  const html = renderToStaticMarkup(<CartProvider><StoreHome slug="example" tenant={{ name: "Демо-магазин", catalog_name: null, tagline: null, business_vertical: id }} products={demoProductsFor(id)} settings={null} campaign={null} storePolicies={null} /></CartProvider>);
  expect(html).toContain(id === "food" ? "Открыть меню" : "Открыть каталог");
  if (id !== "food") expect(html).toContain("color:var(--store-accent-ink)");
  expect(html).toContain("<img");
  if (id !== "food") expect(html).toContain(`data-cover="${id}"`);
  expect(html).not.toContain("Каталог готовится");
});

it.each(commerceConfigurations.filter((config) => config.approach === "assortment" && config.vertical !== "food"))("offers real category shortcuts for $id", (config) => {
  vi.stubGlobal("React", React);
  const items = demoProductsFor(config.vertical);
  const html = renderToStaticMarkup(<CartProvider><StoreHome slug="own" tenant={{ name: "Демо-магазин", catalog_name: null, tagline: null, business_vertical: config.vertical }} products={items} settings={null} campaign={null} storePolicies={null} approach="assortment" /></CartProvider>);
  expect(html).toContain('aria-label="Выбор раздела"');
  for (const category of new Set(items.map((product) => product.category))) expect(html).toContain(`/s/own/category/${encodeURIComponent(category)}`);
});

it("does not inject sample products into an empty real store", () => {
  vi.stubGlobal("React", React);
  const html = renderToStaticMarkup(<CartProvider><StoreHome slug="own" tenant={{ name: "Магазин", catalog_name: null, tagline: null, business_vertical: "beauty" }} products={[]} settings={null} campaign={null} storePolicies={null} /></CartProvider>);
  expect(html).toContain("Каталог готовится");
  expect(html).not.toContain("<img");
});

it("presents food as a menu with fulfilment before ordering", () => {
  vi.stubGlobal("React", React);
  const html = renderToStaticMarkup(<CartProvider><StoreHome slug="food" tenant={{ name: "Кафе", catalog_name: null, tagline: null, business_vertical: "food" }} products={demoProductsFor("food")} settings={null} campaign={null} storePolicies={null} approach="assortment" checkoutOptions={{ deliveryEnabled: true, pickupEnabled: true }} /></CartProvider>);
  expect(html).toContain("Выбрать получение");
  expect(html).toContain(">Меню<");
  expect(html).not.toContain('aria-label="Истории магазина"');
  expect(html).toContain('aria-label="Категории меню"');
  expect(html).toContain("Выбрать состав: Круассан с миндалём");
});

it("does not invent food stories for an empty merchant", () => {
  vi.stubGlobal("React", React);
  const html = renderToStaticMarkup(<CartProvider><StoreHome slug="own" tenant={{ name: "Кафе", catalog_name: null, tagline: null, business_vertical: "food" }} products={[]} settings={null} campaign={null} storePolicies={null} approach="assortment" /></CartProvider>);
  expect(html).not.toContain("Истории магазина:");
});

it.each(["collection", "assortment", "guided"] as const)("shows owner-published food stories in %s layout without demo products", (approach) => {
  vi.stubGlobal("React", React);
  const html = renderToStaticMarkup(<CartProvider><StoreHome slug="own" tenant={{ name: "Кафе", catalog_name: null, tagline: null, business_vertical: "food" }} products={[]} settings={null} campaign={null} storePolicies={null} approach={approach} foodStories={[{ id: "story-1", title: "Обед", caption: "Сегодня", mediaUrl: "https://example.com/lunch.jpg", mediaType: "image", productId: null }]} /></CartProvider>);
  expect(html).toContain('aria-label="Открыть историю: Обед"');
  expect(html).not.toContain("Круассан с миндалём");
});
