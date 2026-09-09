"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft, ShoppingBag } from "lucide-react";
import { money, type Product } from "@/lib/demo-data";
import { useCart } from "./cart-provider";

export function ProductDetail({ product, slug, deliveryPolicy, returnPolicy }: { product: Product; slug: string; deliveryPolicy: string | null; returnPolicy: string | null }) {
  const available = product.variants.find(variant => variant.stock > 0);
  const [selected, setSelected] = useState(available?.id ?? "");
  const [added, setAdded] = useState(false);
  const { add, items, total } = useCart();
  const router=useRouter();
  const dialog=useRef<HTMLDialogElement>(null);
  const variant=product.variants.find(v=>v.id===selected);
  const inCart=items.find(item=>item.variantId===selected)?.qty??0;
  const canAdd=Boolean(variant&&variant.stock>inCart);
  useEffect(()=>{if(added)dialog.current?.showModal();},[added]);
  function addSelected(buyNow=false){
    if(!canAdd)return;
    add(product,selected);
    if(buyNow)router.push(`/s/${slug}/checkout`);else setAdded(true);
  }
  const images = product.images ?? [];
  const variationLabel = product.variants.some(variant => variant.size) ? "Выберите размер" : "Выберите вариант";
  return <main className="container py-8">
    <Link href={`/s/${slug}/catalog`} className="muted inline-flex items-center gap-1 text-sm"><ChevronLeft size={17}/> Назад в каталог</Link>
    <div className="mt-7 grid gap-10 md:grid-cols-[1.1fr_.9fr]">
      <div className="grid grid-cols-2 gap-3">
        <div style={images[0] ? { backgroundImage: `url(${images[0]})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} className="product-image col-span-2 aspect-[5/4] rounded-[28px]"/>
        {images.slice(1).map(image => <div key={image} style={{ backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" }} className="product-image aspect-square rounded-[20px]"/>)}
      </div>
      <div className="md:p-5">
        <h1 className="text-4xl font-semibold">{product.title}</h1>
        <div className="mt-4 flex items-center gap-3"><b className="text-2xl">{money(product.price)}</b>{product.oldPrice && <s className="muted">{money(product.oldPrice)}</s>}</div>
        {product.description && <p className="muted mt-6 leading-7">{product.description}</p>}
        <div className="mt-8"><b>{variationLabel}</b><div className="mt-3 grid grid-cols-4 gap-2">{product.variants.map(variant => <button type="button" disabled={variant.stock === 0} onClick={() => setSelected(variant.id)} key={variant.id} className={`relative h-12 rounded-xl border font-bold ${selected === variant.id ? "border-[var(--tenant-accent)] bg-[var(--accent-soft)]" : "border-slate-200"} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}>{variant.size ?? variant.color ?? "Один вариант"}{variant.stock === 0 && <span className="absolute inset-x-2 top-1/2 h-px rotate-[-18deg] bg-slate-400"/>}</button>)}</div></div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>addSelected()} disabled={!canAdd} className="btn btn-secondary disabled:opacity-50"><ShoppingBag size={19}/>В корзину</button><button type="button" onClick={()=>addSelected(true)} disabled={!canAdd} className="btn btn-cta disabled:opacity-50">Купить сейчас</button></div>
        {!canAdd&&<p role="status" className="mt-3 text-sm text-neutral-500">{variant&&inCart>=variant.stock&&variant.stock>0?"Всё доступное количество уже в корзине.":"Этот вариант сейчас недоступен."}</p>}
        <p className="mt-3 text-xs text-neutral-500">«Купить сейчас» добавит товар и откроет оформление заказа. Деньги не списываются при нажатии.</p>
        {(deliveryPolicy || returnPolicy) && <div className="mt-7 space-y-4 border-t pt-6 text-sm">{deliveryPolicy && <p><span className="font-bold">Доставка</span><span className="mt-1 block whitespace-pre-line opacity-70">{deliveryPolicy}</span></p>}{returnPolicy && <p><span className="font-bold">Обмен и возврат</span><span className="mt-1 block whitespace-pre-line opacity-70">{returnPolicy}</span></p>}</div>}
      </div>
    </div>
    <dialog ref={dialog} onClose={()=>setAdded(false)} aria-labelledby="cart-added-title" className="m-auto w-[calc(100%_-_32px)] max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl backdrop:bg-black/40">
      <h2 id="cart-added-title" className="flex items-center gap-2 text-xl font-semibold"><Check size={22}/>Товар в корзине</h2><p className="mt-3">{product.title}</p><p className="mt-2 text-sm text-neutral-500">Всего в корзине: {money(total)}</p>
      <div className="mt-6 grid gap-3"><Link href={`/s/${slug}/catalog`} onClick={()=>dialog.current?.close()} className="btn btn-secondary">Продолжить покупки</Link><Link href={`/s/${slug}/cart`} onClick={()=>dialog.current?.close()} className="btn btn-primary">Перейти в корзину</Link><button type="button" onClick={()=>dialog.current?.close()} className="py-2 text-sm text-neutral-500">Остаться на товаре</button></div>
    </dialog>
  </main>;
}
