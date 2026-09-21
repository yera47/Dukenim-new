import Image from "next/image";
import { demoProductsFor } from "@/lib/demo-catalogs";
import { money } from "@/lib/demo-data";
import type { BusinessVertical } from "@/types/database";
import type { CommerceApproach } from "@/lib/commerce-configurations";

/** Illustrative example, deliberately separate from the merchant's actual draft. */
export function TemplateIllustration({vertical,compact=false,approach}:{vertical:BusinessVertical;compact?:boolean;approach?:CommerceApproach}) {
  const products=demoProductsFor(vertical).filter(product=>product.images?.[0]).slice(0,4);
  const mode=approach??(compact?"assortment":"collection");
  return <div aria-label="Иллюстрация структуры на демонстрационных товарах" className="overflow-hidden rounded-xl border border-neutral-200 bg-white text-neutral-900">
    <div className="flex items-center justify-between border-b px-4 py-3"><b className="text-sm">dukenim {vertical} shop.</b><span className="text-xs text-neutral-500">Меню · Корзина</span></div>
    {mode==="collection"&&products[0]&&<>
      <div className="grid min-h-52 grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] items-stretch bg-neutral-100 sm:min-h-64"><div className="flex flex-col justify-center p-4 sm:p-7"><span className="text-[10px] uppercase tracking-[.16em]">{vertical==="food"?"Галерея кафе":"Новая коллекция"}</span><b className="mt-3 block text-lg leading-tight sm:text-3xl">{vertical==="food"?"Блюда крупным планом, меню — сразу ниже":"В центре внимания — ваш продукт"}</b><span className="mt-4 inline-block self-start rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white">{vertical==="food"?"Перейти к меню →":"Смотреть →"}</span></div><Image unoptimized width={700} height={700} src={products[0].images![0]} alt="" loading="lazy" className="h-full min-h-52 w-full object-cover sm:min-h-64"/></div>
      <div className="hidden grid-cols-2 gap-3 p-4 sm:grid">{products.slice(1,3).map(product=><ProductTile key={product.id} product={product}/>)}</div>
    </>}
    {mode==="assortment"&&<>
      {vertical==="food"?<div className="flex gap-2 border-b p-3">{products.slice(0,3).map(product=><div key={product.id} className="relative h-24 w-20 overflow-hidden rounded-2xl border-2 border-[#6650cf]"><Image unoptimized width={150} height={200} src={product.images![0]} alt="" className="h-full w-full object-cover"/><span className="absolute inset-x-0 bottom-0 bg-black/50 p-1 text-[9px] text-white">{product.title}</span></div>)}</div>:<div className="border-b p-4"><div className="rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500">Найти товар…</div><p className="mt-3 text-xs text-neutral-500">Все · Популярное · В наличии</p></div>}
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">{products.map((product,index)=><ProductTile key={product.id} product={product} className={index>1?"hidden sm:block":undefined}/>)}</div>
    </>}
    {mode==="guided"&&<>
      <div className="p-5"><b className="text-xl">С чего начать?</b><div className="mt-4 grid grid-cols-3 gap-3">{products.slice(0,3).map(product=><div key={product.id} className="text-center"><Image unoptimized width={360} height={360} src={product.images![0]} alt="" loading="lazy" className="aspect-square w-full rounded-full object-cover"/><p className="mt-2 truncate text-xs font-semibold">{product.title}</p></div>)}</div></div>
      <div className="hidden grid-cols-2 gap-3 border-t p-4 sm:grid">{products.slice(0,2).map(product=><ProductTile key={product.id} product={product}/>)}</div>
    </>}
    <p className="hidden border-t px-4 py-3 text-xs text-neutral-500 sm:block">Наглядный пример · не товары вашего магазина</p>
  </div>;
}

function ProductTile({product,className}:{product:ReturnType<typeof demoProductsFor>[number];className?:string}){
  return <div className={`min-w-0 ${className??""}`}><Image unoptimized width={500} height={500} src={product.images![0]} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover sm:aspect-square"/><p className="mt-2 truncate text-xs">{product.title}</p><b className="text-sm">{money(product.price)}</b></div>;
}
