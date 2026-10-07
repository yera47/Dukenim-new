import {BuyerHub} from "@/components/store/buyer-hub";
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { configurationFor } from "@/lib/commerce-configurations";
import { configurationSlug } from "@/lib/storefront-path";
import { approvedConceptDemoNames, demoProductsFor } from "@/lib/demo-catalogs";
import { CatalogBrowser } from "@/components/store/catalog-browser";
import { ProductDetail } from "@/components/store/product-detail";
import { DemoBasket } from "@/components/store/demo-basket";

export default async function DemoSubpage({params,searchParams}:{params:Promise<{vertical:string;approach:string;path:string[]}>;searchParams?:Promise<{fixture?:string}>}) {
  const [{vertical,approach,path},query]=await Promise.all([params,searchParams??Promise.resolve<{fixture?:string}>({})]);
  const config=configurationFor(vertical,approach);if(!config)notFound();
  const products=demoProductsFor(config.vertical),slug=configurationSlug(vertical,approach);
  if(path.length===1&&path[0]==="orders")return <BuyerHub slug={slug} base={config.href} demo/>;
  if(path.length===1&&(path[0]==="cart"||path[0]==="checkout"))return <DemoBasket base={config.href} slug={slug} checkout={path[0]==="checkout"} fixtureProduct={query.fixture==="reference"&&approach==="collection"?(vertical==="flowers"?products[1]:products[0]):undefined}/>;
  if(path.length===2&&path[0]==="product") {
    const product=products.find(p=>p.id===path[1]);if(!product)notFound();
    return <ProductDetail product={product} slug={slug} sellerName={approvedConceptDemoNames[config.vertical] ?? (config.vertical === "food" ? "BULKA" : "Synthetic demo store")} deliveryPolicy={null} returnPolicy={null}/>;
  }
  let category:string|null=null;
  if(path.length===2&&path[0]==="category") {
    try { category=decodeURIComponent(path[1]); } catch { notFound(); }
  }
  if(!(path.length===1&&path[0]==="catalog")&&!category)notFound();
  if(category&&!products.some(p=>p.category===category))notFound();
  return <main className="container py-10"><Link href={config.href} className="text-sm opacity-60">← Главная</Link><h1 className="my-8 text-4xl font-semibold">{category??"Все товары"}</h1><CatalogBrowser key={category??"all"} slug={slug} products={category?products.filter(p=>p.category===category):products}/></main>;
}
