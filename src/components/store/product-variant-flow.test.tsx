import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
import type {Product} from "@/lib/demo-data";
import {CartProvider} from "./cart-provider";
import {ProductDetail} from "./product-detail";
import {CartItemCard} from "./cart-item-card";
import {CheckoutClient} from "@/app/s/[slug]/checkout/checkout-client";
import {addCartItem} from "@/lib/cart-items";

vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn(),replace:vi.fn()}),usePathname:()=>"/"}));

const product:Product={id:"coat",title:"\u0416\u0430\u043a\u0435\u0442",description:"\u0414\u0435\u043c\u043e",price:32000,category:"\u041e\u0434\u0435\u0436\u0434\u0430",variants:[{id:"m",size:"M",color:"\u0427\u0451\u0440\u043d\u044b\u0439",stock:2}]};

beforeEach(()=>vi.stubGlobal("React",React));

describe("required product variant journey",()=>{
 it("blocks add and buy until the buyer explicitly chooses the required variant",()=>{const html=renderToStaticMarkup(<CartProvider><ProductDetail product={product} slug="demo" sellerName="Synthetic seller" deliveryPolicy={null} returnPolicy={null}/></CartProvider>);expect(html).toContain("\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u0432\u0430\u0440\u0438\u0430\u043d\u0442");expect((html.match(/disabled=""/g)??[]).length).toBeGreaterThanOrEqual(2);});
 it("shows the persisted selection in cart and checkout summaries",()=>{const item=addCartItem([],product,"m")[0];const cart=renderToStaticMarkup(<CartProvider><CartItemCard item={item} base="/demo"/></CartProvider>);const checkout=renderToStaticMarkup(<CartProvider initialItem={{product,variantId:"m"}}><CheckoutClient demo slug="demo" basePath="/demo" deliveryEnabled pickupEnabled pickupLocation={{address:"Demo"}} minOrder={0} zones={[{id:"zone",name:"Demo",cost:0,freeFrom:0,etaText:null,provider:"own"}]}/></CartProvider>);expect(cart).toContain("\u0427\u0451\u0440\u043d\u044b\u0439 \u00b7 M");expect(checkout).toContain("\u0427\u0451\u0440\u043d\u044b\u0439 \u00b7 M");});
});
