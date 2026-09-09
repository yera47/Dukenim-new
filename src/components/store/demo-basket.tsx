"use client";
import Link from "next/link";
import { useCart } from "./cart-provider";
import { money } from "@/lib/demo-data";

export function DemoBasket({base,checkout}:{base:string;checkout:boolean}) {
  const {items,remove,total}=useCart();
  return <main className="container min-h-[60vh] py-10"><Link href={`${base}/catalog`}>← Продолжить покупки</Link><h1 className="my-8 text-4xl font-semibold">{checkout?"Проверка заказа":"Корзина"}</h1>
    {!items.length?<p className="py-12">Корзина пока пуста. Выберите товары в каталоге.</p>:<div className="grid gap-8 md:grid-cols-[1fr_320px]"><div className="space-y-4">{items.map(item=><article key={item.variantId} className="flex items-center gap-4 rounded-2xl border border-current/10 p-4"><div className="min-w-0 flex-1"><Link href={`${base}/product/${item.product.id}`} className="font-semibold">{item.product.title}</Link><p className="mt-2 text-sm opacity-60">{money(item.product.price)} × {item.qty}</p></div><button type="button" className="min-h-11 px-3 text-sm underline" onClick={()=>remove(item.variantId)}>Удалить</button></article>)}</div><aside className="h-fit rounded-2xl border border-current/10 p-6"><p className="flex justify-between text-xl font-semibold"><span>Товары</span><span>{money(total)}</span></p>{checkout?<p className="mt-6 text-sm leading-6 opacity-70">Это демонстрационный магазин. Реальный заказ и оплата отключены. В вашем магазине покупатель сможет указать контакты и выбрать настроенный вами способ получения.</p>:<Link href={`${base}/checkout`} className="btn btn-primary mt-6 w-full">Оформить заказ</Link>}</aside></div>}
  </main>;
}
