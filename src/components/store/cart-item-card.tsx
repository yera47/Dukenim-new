"use client";
import Image from "next/image";
import Link from "next/link";
import {X} from "lucide-react";
import {money} from "@/lib/demo-data";
import type {CartItem} from "@/lib/cart-items";
import {useCart} from "./cart-provider";
import {QuantityControl} from "./quantity-control";
import {FoodConfigurator} from "./food-configurator";
export function CartItemCard({item,base}:{item:CartItem;base:string}){
 const {remove}=useCart();const configurable=Boolean(item.product.foodOptions?.ingredients.length||item.product.foodOptions?.groups.length);
 return <article className="rounded-[22px] border border-[#ede8f2] bg-white p-4 sm:p-5"><div className="flex items-start gap-3">{item.product.images?.[0]&&<Image unoptimized src={item.product.images[0]} alt="" width={160} height={160} className="size-[72px] shrink-0 rounded-2xl object-cover sm:size-20"/>}<div className="min-w-0 flex-1"><Link href={`${base}/product/${item.product.id}`} className="block text-[15px] font-semibold leading-snug">{item.product.title}</Link>{item.product.variants.find(v=>v.id===item.variantId)?.size&&<p className="mt-1 text-xs text-neutral-500">{item.product.variants.find(v=>v.id===item.variantId)?.size}</p>}<p className="mt-2 text-xs text-neutral-400">{money(item.unitPrice)} за 1 шт.</p>{configurable&&<div className="mt-2 text-xs"><FoodConfigurator product={item.product} variantId={item.variantId} lineId={item.lineId} label="Изменить состав"/></div>}</div><button type="button" aria-label={`Удалить ${item.product.title}`} className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-neutral-400 hover:bg-neutral-50" onClick={()=>remove(item.lineId)}><X size={18}/></button></div>{item.labels.length>0&&<div className="mt-3 rounded-xl bg-[#faf8fc] px-3 py-2 text-xs leading-6 text-[#8b7e99]">{item.labels.map((label,index)=><p key={index}>{label}</p>)}</div>}<div className="mt-4 flex items-center justify-between gap-4 border-t border-[#f5f1f9] pt-3"><strong className="text-base font-bold">{money(item.unitPrice*item.qty)}</strong><QuantityControl product={item.product} variantId={item.variantId} lineId={item.lineId} qty={item.qty}/></div></article>;
}
