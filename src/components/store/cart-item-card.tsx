"use client";
import Image from "next/image";
import Link from "next/link";
import {X} from "lucide-react";
import {money} from "@/lib/demo-data";
import {variantLabel,type CartItem} from "@/lib/cart-items";
import {useCart} from "./cart-provider";
import {QuantityControl} from "./quantity-control";
import {FoodConfigurator} from "./food-configurator";

export function CartItemCard({item,base}:{item:CartItem;base:string}){
 const {remove}=useCart();
 const configurable=Boolean(item.product.foodOptions?.ingredients.length||item.product.foodOptions?.groups.length);
 const selectedLabel=variantLabel(item.product,item.variantId);
 return <article className="rounded-[var(--store-card-radius)] border border-current/10 bg-[var(--store-surface)] p-4 sm:p-5">
  <div className="flex items-start gap-3">
   {item.product.images?.[0]?<Image unoptimized src={item.product.images[0]} alt={item.product.title} width={160} height={160} className="size-[72px] shrink-0 rounded-[calc(var(--store-card-radius)*.6)] object-cover sm:size-20"/>:<div aria-hidden="true" className="size-[72px] shrink-0 rounded-[calc(var(--store-card-radius)*.6)] bg-[color-mix(in_srgb,var(--tenant-accent)_10%,var(--store-surface))] sm:size-20"/>}
   <div className="min-w-0 flex-1">
    <Link href={`${base}/product/${item.product.id}`} className="block text-[15px] font-semibold leading-snug">{item.product.title}</Link>
    {selectedLabel&&<p className="mt-1 text-xs font-semibold opacity-70">{selectedLabel}</p>}
    <p className="mt-2 text-xs opacity-55">{money(item.unitPrice)} за 1 шт.</p>
    {configurable&&<div className="mt-2 text-xs"><FoodConfigurator product={item.product} variantId={item.variantId} lineId={item.lineId} label="Изменить состав"/></div>}
   </div>
   <button type="button" aria-label={`Удалить ${item.product.title}`} className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full opacity-55 hover:bg-black/5" onClick={()=>remove(item.lineId)}><X size={18}/></button>
  </div>
  {item.labels.length>0&&<div className="mt-3 rounded-xl bg-[var(--store-bg)] px-3 py-2 text-xs leading-6 opacity-70">{item.labels.map((label,index)=><p key={index}>{label}</p>)}</div>}
  <div className="mt-4 flex items-center justify-between gap-4 border-t border-current/10 pt-3"><strong className="text-base font-bold">{money(item.unitPrice*item.qty)}</strong><QuantityControl product={item.product} variantId={item.variantId} lineId={item.lineId} qty={item.qty}/></div>
 </article>;
}
