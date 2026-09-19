"use client";

import { useEffect, useState } from "react";
import { MapPin, Store, Truck, X } from "lucide-react";

type Method = "courier" | "pickup";

export function FoodFulfilmentGate({slug,deliveryEnabled,pickupEnabled}:{slug:string;deliveryEnabled:boolean;pickupEnabled:boolean}) {
  const [open,setOpen]=useState(false);
  const [selected,setSelected]=useState<Method|null>(null);

  useEffect(()=>{
    const saved=window.sessionStorage.getItem(`dukenim:${slug}:fulfilment`);
    if(saved==="courier"||saved==="pickup") setSelected(saved);
    else setOpen(true);
  },[slug]);

  function choose(method:Method){
    window.sessionStorage.setItem(`dukenim:${slug}:fulfilment`,method);
    setSelected(method);
    setOpen(false);
    document.getElementById("catalog")?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  if(!deliveryEnabled&&!pickupEnabled)return null;
  return <>
    <div className="container pb-5"><button type="button" onClick={()=>setOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[var(--store-surface)] px-4 py-2 text-sm font-semibold"><MapPin size={16}/>{selected==="courier"?"Доставка":selected==="pickup"?"Самовывоз":"Выбрать получение"}</button></div>
    {open&&<div className="fixed inset-0 z-[80] grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="fulfilment-title">
      <section className="relative w-full max-w-xl rounded-t-3xl bg-white p-6 text-neutral-950 shadow-2xl sm:rounded-3xl sm:p-8">
        {selected&&<button type="button" aria-label="Закрыть" onClick={()=>setOpen(false)} className="absolute right-5 top-5 rounded-full p-2 hover:bg-neutral-100"><X size={20}/></button>}
        <p className="text-sm font-bold text-neutral-500">Сначала выберите получение</p>
        <h2 id="fulfilment-title" className="mt-2 text-3xl font-semibold">Как хотите заказать?</h2>
        <p className="mt-2 text-sm text-neutral-600">После выбора покажем меню. Точный адрес и время укажете при оформлении.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {deliveryEnabled&&<button type="button" onClick={()=>choose("courier")} className="rounded-2xl border-2 border-neutral-200 p-5 text-left hover:border-neutral-950"><Truck size={28}/><strong className="mt-5 block text-lg">Доставка</strong><span className="mt-1 block text-sm text-neutral-500">Привезём по указанному адресу</span></button>}
          {pickupEnabled&&<button type="button" onClick={()=>choose("pickup")} className="rounded-2xl border-2 border-neutral-200 p-5 text-left hover:border-neutral-950"><Store size={28}/><strong className="mt-5 block text-lg">Самовывоз</strong><span className="mt-1 block text-sm text-neutral-500">Заберёте в удобное время</span></button>}
        </div>
      </section>
    </div>}
  </>;
}
