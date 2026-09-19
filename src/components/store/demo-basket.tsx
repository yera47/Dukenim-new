"use client";
import Link from "next/link";
import {useCart} from "./cart-provider";
import {money} from "@/lib/demo-data";
import {CartItemCard} from "./cart-item-card";
export function DemoBasket({base,checkout}:{base:string;checkout:boolean}){
 const {items,total}=useCart();
 return <main className="container min-h-[60vh] py-7"><Link className="text-sm text-neutral-500" href={`${base}/catalog`}>← Продолжить покупки</Link><h1 className="my-6 text-3xl font-semibold">{checkout?"Проверка заказа":"Корзина"}</h1>{!items.length?<p className="py-12">Корзина пока пуста. Выберите товары в каталоге.</p>:<div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-3">{items.map(item=><CartItemCard key={item.lineId} item={item} base={base}/>)}</div><aside className="h-fit rounded-[22px] border border-current/10 p-5"><p className="flex justify-between text-lg font-semibold"><span>Итого</span><span>{money(total)}</span></p>{checkout?<p className="mt-5 text-sm leading-6 text-neutral-500">Это демонстрационный магазин. Реальный заказ и оплата отключены.</p>:<Link href={`${base}/checkout`} className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[#6850cb] px-4 text-sm font-semibold text-white">Оформить заказ</Link>}</aside></div>}</main>;
}
