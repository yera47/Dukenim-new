import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { StoreHome } from "./store-home";
import { demoProductsFor } from "@/lib/demo-catalogs";
import { launchVerticals } from "@/lib/launch-verticals";
import { commerceConfigurations } from "@/lib/commerce-configurations";

vi.mock("./catalog-browser",()=>({CatalogBrowser:()=>null}));
vi.mock("@/components/store/catalog-browser",()=>({CatalogBrowser:()=>null}));
afterEach(()=>vi.unstubAllGlobals());
it.each(commerceConfigurations)("renders the configured block order for $id",config=>{
 vi.stubGlobal("React",React);
 const html=renderToStaticMarkup(<StoreHome slug="example" tenant={{name:"Dukenim Shop",catalog_name:null,tagline:null,business_vertical:config.vertical}} products={demoProductsFor(config.vertical)} settings={null} campaign={null} storePolicies={null} approach={config.approach}/>);
 expect(html).toContain(`data-approach="${config.approach}"`);
 expect(html.includes("storefront-hero-grid")).toBe(config.approach==="collection");
 expect(html.includes('aria-label="Выбор раздела"')).toBe(config.approach==="guided");
});
it.each(launchVerticals)("renders real shared example imagery and readable CTA for $id",({id})=>{
  vi.stubGlobal("React",React);
  const html=renderToStaticMarkup(<StoreHome slug="example" tenant={{name:"Серик Шоп",catalog_name:null,tagline:null,business_vertical:id}} products={demoProductsFor(id)} settings={null} campaign={null} storePolicies={null}/>);
  expect(html).toContain("Смотреть каталог");
  expect(html).toContain('style="color:var(--store-accent-ink)"');
  expect(html).toContain("<img");
  expect(html).toContain(`data-cover="${id}"`);
  expect(html).not.toContain("Каталог наполняется");
});
it.each(commerceConfigurations.filter(config=>config.approach==="assortment"))("offers real category shortcuts for $id",config=>{
 vi.stubGlobal("React",React);
 const products=demoProductsFor(config.vertical);
 const html=renderToStaticMarkup(<StoreHome slug="own" tenant={{name:"Серик Шоп",catalog_name:null,tagline:null,business_vertical:config.vertical}} products={products} settings={null} campaign={null} storePolicies={null} approach="assortment"/>);
 expect(html).toContain('aria-label="Быстрый выбор раздела"');
 for(const category of new Set(products.map(product=>product.category)))expect(html).toContain(`/s/own/category/${encodeURIComponent(category)}`);
});
it("does not inject sample products into an empty real store",()=>{
  vi.stubGlobal("React",React);
  const html=renderToStaticMarkup(<StoreHome slug="own" tenant={{name:"Серик Шоп",catalog_name:null,tagline:null,business_vertical:"beauty"}} products={[]} settings={null} campaign={null} storePolicies={null}/>);
  expect(html).toContain("Каталог наполняется");
  expect(html).not.toContain("<img");
});
