"use client";

import { useEffect, useState } from "react";
import { Check, MapPin, Store, Truck, X } from "lucide-react";

type Method = "courier" | "pickup";

export function FoodFulfilmentGate({slug,deliveryEnabled,pickupEnabled}:{slug:string;deliveryEnabled:boolean;pickupEnabled:boolean}) {
  const [open,setOpen]=useState(false);
  const [selected,setSelected]=useState<Method|null>(null);

  useEffect(()=>{
    const saved=window.sessionStorage.getItem(`dukenim:${slug}:fulfilment`);
    if((saved==="courier"&&deliveryEnabled)||(saved==="pickup"&&pickupEnabled)) setSelected(saved);
    else setOpen(true);
  },[deliveryEnabled,pickupEnabled,slug]);

  function choose(method:Method){
    window.sessionStorage.setItem(`dukenim:${slug}:fulfilment`,method);
    setSelected(method);
    setOpen(false);
    document.getElementById("catalog")?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  if(!deliveryEnabled&&!pickupEnabled)return null;
  return <>
    <div className="container pb-2"><button type="button" onClick={()=>setOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-[var(--store-surface)] px-4 py-2 text-sm font-semibold"><MapPin size={16}/>{selected==="courier"?"Доставка":selected==="pickup"?"Самовывоз":"Выбрать получение"}{selected&&<span className="text-xs font-medium opacity-55">Изменить</span>}</button></div>
    {open&&<div className="fixed inset-0 z-[80] grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="fulfilment-title">
      <section className="relative w-full max-w-xl rounded-t-3xl bg-white p-6 text-neutral-950 shadow-2xl sm:rounded-3xl sm:p-8">
        {selected&&<button type="button" aria-label="Закрыть" onClick={()=>setOpen(false)} className="absolute right-5 top-5 rounded-full p-2 hover:bg-neutral-100"><X size={20}/></button>}
        <p className="text-sm font-bold text-neutral-500">Сначала выберите получение</p>
        <h2 id="fulfilment-title" className="mt-2 text-3xl font-semibold">Как вам передать заказ?</h2>
        <p className="mt-2 text-sm text-neutral-600">Покажем подходящее меню. Адрес и время уточните при оформлении.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {deliveryEnabled&&<button type="button" aria-pressed={selected==="courier"} onClick={()=>choose("courier")} className={`relative grid min-h-40 grid-rows-[2.5rem_1.5rem_2rem] content-start gap-y-3 rounded-2xl border-2 p-4 text-left transition-colors ${selected==="courier"?"border-[var(--tenant-accent)] bg-[var(--store-accent-soft)]":"border-neutral-200 hover:border-neutral-950"}`}><span className="grid size-10 place-items-center rounded-full bg-white"><Truck size={22}/></span>{selected==="courier"&&<span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-[var(--tenant-accent)] text-[var(--tenant-accent-ink)]"><Check size={14}/></span>}<strong className="block leading-6">Доставка</strong><span className="block text-xs leading-4 text-neutral-500">Курьером по адресу</span></button>}
          {pickupEnabled&&<button type="button" aria-pressed={selected==="pickup"} onClick={()=>choose("pickup")} className={`relative grid min-h-40 grid-rows-[2.5rem_1.5rem_2rem] content-start gap-y-3 rounded-2xl border-2 p-4 text-left transition-colors ${selected==="pickup"?"border-[var(--tenant-accent)] bg-[var(--store-accent-soft)]":"border-neutral-200 hover:border-neutral-950"}`}><span className="grid size-10 place-items-center rounded-full bg-white"><Store size={22}/></span>{selected==="pickup"&&<span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-[var(--tenant-accent)] text-[var(--tenant-accent-ink)]"><Check size={14}/></span>}<strong className="block leading-6">Самовывоз</strong><span className="block text-xs leading-4 text-neutral-500">Бесплатно из магазина</span></button>}
        </div>
      </section>
    </div>}
  </>;
}
