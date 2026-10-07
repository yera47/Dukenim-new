"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft, ShoppingBag } from "lucide-react";
import { money, type Product } from "@/lib/demo-data";
import {FoodConfigurator} from "./food-configurator";
import { useCart } from "./cart-provider";
import { storefrontPath } from "@/lib/storefront-path";

export function ProductDetail({ product, slug, sellerName, deliveryPolicy, returnPolicy }: { product: Product; slug: string; sellerName: string; deliveryPolicy: string | null; returnPolicy: string | null }) {
  const available = product.variants.find(variant => variant.stock > 0);
  const requiresSelection = product.variants.some(variant => Boolean(variant.size) || Boolean(variant.color && !/^(Основной|Стандарт)$/i.test(variant.color)));
  const base = storefrontPath(slug);
  const [selected, setSelected] = useState(requiresSelection ? "" : available?.id ?? "");
  const [added, setAdded] = useState(false);
  const { add, items, total } = useCart();
  const router=useRouter();
  const dialog=useRef<HTMLDialogElement>(null);
  const variant=product.variants.find(v=>v.id===selected);
  const configurable=Boolean(product.foodOptions?.ingredients.length||product.foodOptions?.groups.length);const inCart=items.filter(item=>item.variantId===selected).reduce((sum,i)=>sum+i.qty,0);
  const canAdd=Boolean(variant&&variant.stock>inCart);
  useEffect(()=>{if(added)dialog.current?.showModal();},[added]);
  function addSelected(buyNow=false){
    if(!canAdd)return;
    add(product,selected);
    if(buyNow)router.push(`${base}/checkout`);else setAdded(true);
  }
  const images = product.images ?? [];
  const variationLabel = product.variants.some(variant => variant.size) ? "Выберите размер" : "Выберите вариант";
  return <main data-product-detail className="container py-8">
    <Link href={`${base}/catalog`} className="muted inline-flex items-center gap-1 text-sm"><ChevronLeft size={17}/> Назад в каталог</Link>
    <div data-product-layout className="mt-7 grid gap-10 md:grid-cols-[1.1fr_.9fr]">
      <div data-product-gallery className="grid grid-cols-2 gap-3">
        <div style={images[0] ? { backgroundImage: `url(${images[0]})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} className="product-image col-span-2 aspect-[5/4] rounded-[28px]"/>
        {images.slice(1).map(image => <div key={image} style={{ backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" }} className="product-image aspect-square rounded-[20px]"/>)}
      </div>
      <div data-product-information className="md:p-5">
        <h1 className="text-4xl font-semibold">{product.title}</h1>
        <div className="mt-4 flex items-center gap-3"><b className="text-2xl">{money(product.price)}</b>{product.oldPrice && <s className="muted">{money(product.oldPrice)}</s>}</div>
        {product.description && <p className="muted mt-6 leading-7">{product.description}</p>}
        {product.foodOptions?.nutrition&&<div className="mt-5 rounded-xl border p-4 text-sm"><b>На порцию</b><p className="mt-1 text-neutral-500">{product.foodOptions.nutrition.weightGrams} г · {product.foodOptions.nutrition.kcal} ккал · Б {product.foodOptions.nutrition.protein} г · Ж {product.foodOptions.nutrition.fat} г · У {product.foodOptions.nutrition.carbs} г</p></div>}
        <div className="mt-8"><b>{variationLabel}</b><div className="mt-3 grid grid-cols-4 gap-2">{product.variants.map(variant => <button type="button" disabled={variant.stock === 0} onClick={() => setSelected(variant.id)} key={variant.id} className={`relative h-12 rounded-[var(--store-button-radius)] border font-bold ${selected === variant.id ? "border-[var(--tenant-accent)] bg-[color-mix(in_srgb,var(--tenant-accent)_12%,var(--store-surface))]" : "border-current/15"} disabled:cursor-not-allowed disabled:opacity-40`}>{variant.size ?? variant.color ?? "Один вариант"}{variant.stock === 0 && <span className="absolute inset-x-2 top-1/2 h-px rotate-[-18deg] bg-current opacity-40"/>}</button>)}</div></div>
        {configurable?<div className="mt-8 rounded-[var(--store-card-radius)] bg-[color-mix(in_srgb,var(--tenant-accent)_10%,var(--store-surface))] p-4"><FoodConfigurator product={product} variantId={selected} label="Собрать на свой вкус"/></div>:<div className="mt-8 grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>addSelected()} disabled={!canAdd} className="btn btn-secondary disabled:opacity-50"><ShoppingBag size={19}/>В корзину</button><button type="button" onClick={()=>addSelected(true)} disabled={!canAdd} className="btn btn-cta disabled:opacity-50">Купить сейчас</button></div>}
        {!canAdd&&<p role="status" className="mt-3 text-sm text-neutral-500">{requiresSelection&&!selected?"Сначала выберите обязательный вариант.":variant&&inCart>=variant.stock&&variant.stock>0?"Всё доступное количество уже в корзине.":"Этот вариант сейчас недоступен."}</p>}
        {!configurable&&<p className="mt-3 text-xs text-neutral-500">«Купить сейчас» добавит товар и откроет оформление заказа. Деньги не списываются при нажатии.</p>}
        <div className="mt-6 grid gap-3 rounded-[var(--store-card-radius)] border border-current/10 p-4 text-sm"><p><span className="font-bold">Продавец</span><span className="mt-1 block opacity-70">{sellerName}</span></p>{product.variants.some(item=>item.size)&&<p><span className="font-bold">Размеры</span><span className="mt-1 block opacity-70">{Array.from(new Set(product.variants.map(item=>item.size).filter(Boolean))).join(" · ")}. Таблица мерок продавцом не добавлена.</span></p>}<p><span className="font-bold">Получение</span><span className="mt-1 block opacity-70">Доступные доставка и самовывоз, адрес и точная стоимость показываются на оформлении по настройкам продавца.</span></p>{!deliveryPolicy&&<p><span className="font-bold">Условия доставки</span><span className="mt-1 block opacity-70">Продавец не опубликовал отдельные условия.</span></p>}</div>
        {(deliveryPolicy || returnPolicy) && <div className="mt-7 space-y-4 border-t pt-6 text-sm">{deliveryPolicy && <p><span className="font-bold">Доставка</span><span className="mt-1 block whitespace-pre-line opacity-70">{deliveryPolicy}</span></p>}{returnPolicy && <p><span className="font-bold">Обмен и возврат</span><span className="mt-1 block whitespace-pre-line opacity-70">{returnPolicy}</span></p>}</div>}
      </div>
    </div>
    <dialog ref={dialog} onClose={()=>setAdded(false)} aria-labelledby="cart-added-title" className="m-auto w-[calc(100%_-_32px)] max-w-md rounded-[var(--store-card-radius)] border border-current/10 bg-[var(--store-surface)] p-6 text-[var(--store-ink)] shadow-xl backdrop:bg-black/40">
      <h2 id="cart-added-title" className="flex items-center gap-2 text-xl font-semibold"><Check size={22}/>Товар в корзине</h2><p className="mt-3">{product.title}</p><p className="mt-2 text-sm text-neutral-500">Всего в корзине: {money(total)}</p>
      <div className="mt-6 grid gap-3"><Link href={`${base}/catalog`} onClick={()=>dialog.current?.close()} className="btn btn-secondary">Продолжить покупки</Link><Link href={`${base}/cart`} onClick={()=>dialog.current?.close()} className="btn btn-cta">Перейти в корзину</Link><button type="button" onClick={()=>dialog.current?.close()} className="py-2 text-sm opacity-60">Остаться на товаре</button></div>
    </dialog>
  </main>;
}
