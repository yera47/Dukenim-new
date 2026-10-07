"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "./cart-provider";
import { money, type Product } from "@/lib/demo-data";
import { CartItemCard } from "./cart-item-card";
import { CheckoutClient } from "@/app/s/[slug]/checkout/checkout-client";

export function DemoBasket({ base, slug, checkout, fixtureProduct }: { base: string; slug: string; checkout: boolean; fixtureProduct?: Product }) {
  const { items, total, add, loaded } = useCart();
  useEffect(()=>{const variant=fixtureProduct?.variants[0];if(loaded&&fixtureProduct&&variant&&items.length===0)add(fixtureProduct,variant.id);},[add,fixtureProduct,items.length,loaded]);

  if (checkout) return <CheckoutClient
    demo
    slug={slug}
    basePath={base}
    deliveryEnabled
    pickupEnabled
    pickupLocation={{ address: "Тестовая точка — адрес не публикуется" }}
    minOrder={0}
    zones={[{ id: "demo-zone", name: "Демо-зона", cost: 0, freeFrom: 0, etaText: "Срок подтверждает магазин", provider: "own" }]}
  />;

  return <main className="container min-h-[60vh] py-7">
    <Link className="text-sm text-[var(--store-muted)]" href={`${base}/catalog`}>← Продолжить покупки</Link>
    <h1 className="my-6 text-3xl font-semibold">{checkout ? "Проверка заказа" : "Корзина"}</h1>
    {fixtureProduct ? <p className="mb-5 rounded-xl bg-[var(--store-surface)] p-3 text-xs opacity-70">Локальная тестовая корзина. Реальный заказ не создаётся.</p> : null}
    {!items.length ? <p className="py-12">Корзина пока пуста. Выберите товары в каталоге.</p> : <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-3">{items.map(item => <CartItemCard key={item.lineId} item={item} base={base} />)}</div>
      <aside className="h-fit min-w-0 rounded-[22px] border border-current/10 p-5">
        <p className="flex min-w-0 flex-wrap justify-between gap-2 text-lg font-semibold"><span>Итого</span><span>{money(total)}</span></p>
        {checkout
          ? <p className="mt-5 text-sm leading-6 text-[var(--store-muted)]">Это демонстрационный каталог. Создание заказа и оплата отключены.</p>
          : <Link href={`${base}/checkout${fixtureProduct ? "?fixture=reference" : ""}`} className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[var(--tenant-accent)] px-4 text-center text-sm font-semibold" style={{color:"var(--store-accent-ink)"}}>Оформить заказ</Link>}
      </aside>
    </div>}
  </main>;
}
