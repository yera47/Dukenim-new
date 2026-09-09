import Image from "next/image";
import { demoProductsFor } from "@/lib/demo-catalogs";
import { money } from "@/lib/demo-data";
import type { BusinessVertical } from "@/types/database";

/** Illustrative example, deliberately separate from the merchant's actual draft. */
export function TemplateIllustration({vertical,compact}:{vertical:BusinessVertical;compact:boolean}) {
  const products=demoProductsFor(vertical).filter(product=>product.images?.[0]).slice(0,4);
  return <div aria-label="Иллюстрация структуры на демонстрационных товарах" className="overflow-hidden rounded-xl border border-neutral-200 bg-white text-neutral-900">
    <div className="flex items-center justify-between border-b px-3 py-3"><b className="text-xs">dukenim {vertical} shop.</b><span className="text-[9px]">Каталог · Корзина</span></div>
    {!compact&&products[0]&&<div className="grid grid-cols-2 items-center bg-neutral-100"><div className="p-3"><span className="text-[9px] uppercase tracking-wider">Новая коллекция</span><b className="mt-2 block text-lg leading-tight">В центре внимания — ваш продукт</b><span className="mt-3 inline-block rounded bg-neutral-900 px-2 py-1 text-[9px] text-white">Смотреть коллекцию →</span></div><Image unoptimized width={400} height={400} src={products[0].images![0]} alt="" loading="lazy" className="h-40 w-full object-cover"/></div>}
    {compact&&<div className="p-3"><div className="rounded-md bg-neutral-100 p-2 text-[10px] text-neutral-500">Найти товар…</div><p className="mt-2 text-[9px]">Категории · Цена · В наличии</p></div>}
    <div className={`grid gap-2 p-3 ${compact?"grid-cols-3":"grid-cols-2"}`}>{products.slice(0,compact?3:2).map(product=><div key={product.id}><Image unoptimized width={400} height={400} src={product.images![0]} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover"/><p className="mt-1 truncate text-[9px]">{product.title}</p><b className="text-[10px]">{money(product.price)}</b></div>)}</div>
    <p className="border-t px-3 py-2 text-[9px] text-neutral-500">Пример структуры, не товары вашего магазина</p>
  </div>;
}
