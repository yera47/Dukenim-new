"use client";

import Link from "next/link";
import { ChevronLeft, ShoppingBag, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { money } from "@/lib/demo-data";
import { useCart } from "@/components/store/cart-provider";

export default function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const { items, remove, total } = useCart();
  return <main className="container min-h-[65vh] py-10">
    <Link href={`/s/${slug}`} className="muted inline-flex gap-1 text-sm"><ChevronLeft size={17}/> Продолжить покупки</Link>
    <h1 className="mt-7 text-4xl font-semibold">Корзина</h1>
    {items.length === 0 ? <div className="card mt-8 grid place-items-center py-20 text-center"><ShoppingBag className="text-[var(--accent)]" size={38}/><h2 className="mt-4 text-xl font-bold">Корзина пока пуста</h2><p className="muted mt-2">Добавьте товар из каталога</p><Link href={`/s/${slug}`} className="btn btn-cta mt-6">В каталог</Link></div> : <div className="mt-8 grid gap-8 md:grid-cols-[1fr_380px]">
      <div className="space-y-3">{items.map(item => <div key={item.variantId} className="card flex gap-5 p-4">
        <div className="product-image h-28 w-24 shrink-0 rounded-2xl" style={item.product.images?.[0] ? { backgroundImage: `url(${item.product.images[0]})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}/>
        <div className="flex flex-1 justify-between gap-3"><div><b>{item.product.title}</b><p className="muted mt-2 text-sm">Вариант: {item.product.variants.find(variant => variant.id === item.variantId)?.size ?? "один"}</p><p className="mt-4 font-bold">{money(item.product.price)} × {item.qty}</p></div><button onClick={() => remove(item.variantId)} aria-label={`Удалить ${item.product.title}`} className="self-start p-2 text-slate-400"><Trash2 size={18}/></button></div>
      </div>)}</div>
      <aside className="card h-fit p-6"><h2 className="text-xl font-bold">Итого</h2><div className="mt-6 space-y-3 text-sm"><p className="flex justify-between"><span>Товары</span><b>{money(total)}</b></p><p className="flex justify-between"><span>Доставка</span><b>Рассчитаем далее</b></p></div><div className="mt-6 flex justify-between border-t pt-5 text-xl font-bold"><span>К оплате</span><span>{money(total)}</span></div><Link className="btn btn-cta mt-6 w-full" href={`/s/${slug}/checkout`}>Оформить заказ</Link></aside>
    </div>}
  </main>;
}
