"use client";

import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { money, type Product } from "@/lib/demo-data";
import { storefrontPath } from "@/lib/storefront-path";
import { useCart } from "./cart-provider";

export function FoodProductCard({product,slug}:{product:Product;slug:string}) {
  const {add}=useCart();
  const [added,setAdded]=useState(false);
  const available=product.variants.filter(variant=>variant.stock>0);
  const quickVariant=available.length===1?available[0]:null;
  const href=`${storefrontPath(slug)}/product/${product.id}`;
  const image=product.images?.[0];

  function addQuickly(){
    if(!quickVariant)return;
    add(product,quickVariant.id);
    setAdded(true);
    window.setTimeout(()=>setAdded(false),1600);
  }

  return <article className="food-menu-card">
    <Link href={href} className="food-menu-image" aria-label={`Открыть ${product.title}`} style={image?{backgroundImage:`url(${image})`}:undefined}/>
    <div className="food-menu-copy">
      <Link href={href}><h3>{product.title}</h3></Link>
      {product.description&&<p>{product.description}</p>}
      <div className="food-menu-bottom"><strong>{money(product.price)}</strong>{quickVariant?<button type="button" onClick={addQuickly} aria-label={`Добавить ${product.title} в корзину`}>{added?<><Check size={17}/>Добавлено</>:<><Plus size={17}/>Добавить</>}</button>:available.length?<Link href={href}>Выбрать</Link>:<span>Нет в наличии</span>}</div>
    </div>
  </article>;
}
