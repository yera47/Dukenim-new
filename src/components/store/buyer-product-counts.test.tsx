import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {afterEach,describe,expect,it,vi} from "vitest";
import {demoProductsFor} from "@/lib/demo-catalogs";
import {CartProvider} from "./cart-provider";
import {CatalogBrowser} from "./catalog-browser";
import {FoodQuickMenu} from "./food-quick-menu";
import {StoreHome} from "./store-home";

afterEach(()=>vi.unstubAllGlobals());
const render=(node:React.ReactNode)=>{vi.stubGlobal("React",React);return renderToStaticMarkup(<CartProvider>{node}</CartProvider>);};

describe("buyer catalog product counts",()=>{
  it("omits product totals from the shared non-food storefront",()=>{
    const products=demoProductsFor("fashion");
    const html=render(<StoreHome slug="shop" tenant={{name:"Магазин",catalog_name:null,tagline:null,business_vertical:"fashion"}} products={products} settings={null} campaign={null} storePolicies={null} approach="assortment"/>);
    expect(html).not.toContain(`${products.length} товаров`);
    expect(html).not.toContain(`${products.length} поз.`);
    expect(html).not.toContain(`Позиций: ${products.length}`);
  });

  it("keeps the catalog empty state without a numeric result counter",()=>{
    const html=render(<CatalogBrowser products={[]} slug="shop"/>);
    expect(html).toContain("Ничего не найдено");
    expect(html).not.toContain("Найдено:");
    expect(html).not.toContain("0 поз.");
  });

  it("keeps the food menu and its empty state without item totals",()=>{
    const products=demoProductsFor("food");
    const menu=render(<FoodQuickMenu products={products} slug="cafe" name="Кафе"/>);
    expect(menu).not.toContain(`${products.length} из ${products.length} позиций`);
    const empty=render(<FoodQuickMenu products={[]} slug="cafe" name="Кафе"/>);
    expect(empty).toContain("Меню пока пустое");
    expect(empty).not.toContain("0 из 0");
  });
});
