import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/demo-data";
import { CartProvider } from "./cart-provider";
import { FoodProductCard } from "./food-product-card";

afterEach(()=>vi.unstubAllGlobals());
const dish:Product={id:"dish",title:"Паста",description:"Томаты, сыр и базилик",price:4500,category:"Горячее",variants:[{id:"regular",size:null,color:"Стандарт",stock:5}]};
function card(product:Product){vi.stubGlobal("React",React);return renderToStaticMarkup(<CartProvider><FoodProductCard product={product} slug="cafe"/></CartProvider>);}

describe("food menu card",()=>{
  it("offers one-tap add for a single available serving",()=>{const html=card(dish);expect(html).toContain("Добавить");expect(html).toContain("4 500 ₸");expect(html).toContain("Томаты, сыр и базилик");});
  it("asks the buyer to choose when several variants are available",()=>{const html=card({...dish,variants:[...dish.variants,{id:"large",size:"Большая",color:"Стандарт",stock:2}]});expect(html).toContain("Выбрать");expect(html).not.toContain("Добавить Паста в корзину");});
  it("shows truthful unavailable state",()=>{expect(card({...dish,variants:[{...dish.variants[0],stock:0}]})).toContain("Нет в наличии");});
});
