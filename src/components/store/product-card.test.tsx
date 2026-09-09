import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductCard } from "./product-card";
import type { Product } from "@/lib/demo-data";
afterEach(()=>vi.unstubAllGlobals());
const product:Product={id:"1",title:"Чашка",description:"Керамика",price:2000,category:"Дом",variants:[{id:"v",size:null,color:"Белый",stock:0}]};
describe("truthful product presentation",()=>{
  it("does not invent popularity, novelty or stock",()=>{vi.stubGlobal("React",React);const html=renderToStaticMarkup(<ProductCard product={product} slug="shop"/>);expect(html).not.toContain("Новинка");expect(html).not.toContain("Хит");expect(html).toContain("Нет в наличии");expect(html).not.toContain("Прежняя цена");});
  it("shows a merchant selection and genuine lower price",()=>{vi.stubGlobal("React",React);const html=renderToStaticMarkup(<ProductCard product={{...product,featured:true,oldPrice:3000,variants:[{...product.variants[0],stock:1}]}} slug="shop"/>);expect(html).toContain("Выбор магазина");expect(html).toContain("Прежняя цена");expect(html).toContain("В наличии");});
  it("does not display an invalid previous price as a discount",()=>{vi.stubGlobal("React",React);expect(renderToStaticMarkup(<ProductCard product={{...product,oldPrice:1000}} slug="shop"/>)).not.toContain("Прежняя цена");});
});
