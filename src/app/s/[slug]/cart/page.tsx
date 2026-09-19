"use client";

import Link from "next/link";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { useParams } from "next/navigation";
import { money } from "@/lib/demo-data";
import {CartItemCard} from "@/components/store/cart-item-card";
import { useCart } from "@/components/store/cart-provider";

export default function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const { items, total } = useCart();
  return <main className="container min-h-[65vh] py-10">
    <Link href={`/s/${slug}`} className="muted inline-flex gap-1 text-sm"><ChevronLeft size={17}/> Продолжить покупки</Link>
    <h1 className="mt-7 text-4xl font-semibold">Корзина</h1>
    {items.length === 0 ? <div className="card mt-8 grid place-items-center py-20 text-center"><ShoppingBag className="text-[var(--accent)]" size={38}/><h2 className="mt-4 text-xl font-bold">Корзина пока пуста</h2><p className="muted mt-2">Добавьте товар из каталога</p><Link href={`/s/${slug}`} className="btn btn-cta mt-6">В каталог</Link></div> : <div className="mt-8 grid gap-8 md:grid-cols-[1fr_380px]">
      <div className="space-y-3">{items.map(item=><CartItemCard key={item.lineId} item={item} base={`/s/${slug}`}/>)}</div><aside className="card h-fit p-6"><h2 className="text-xl font-bold">Итого</h2><div className="mt-6 space-y-3 text-sm"><p className="flex justify-between"><span>Товары</span><b>{money(total)}</b></p><p className="flex justify-between"><span>Доставка</span><b>Рассчитаем далее</b></p></div><div className="mt-6 flex justify-between border-t pt-5 text-xl font-bold"><span>К оплате</span><span>{money(total)}</span></div><Link className="btn btn-cta mt-6 w-full" href={`/s/${slug}/checkout`}>Оформить заказ</Link></aside>
    </div>}
  </main>;
}
