"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Search, SlidersHorizontal, X } from "lucide-react";
import type { Product } from "@/lib/demo-data";
import { emptyCatalogFilters, filterCatalog, type CatalogFilters } from "@/lib/catalog-filter";
import type { CommerceApproach } from "@/lib/commerce-configurations";
import { ProductCard } from "./product-card";
import { FoodProductCard } from "./food-product-card";

const nonQueryFilterCount=(value:CatalogFilters)=>Number(Boolean(value.category))+Number(Boolean(value.size))+Number(value.inStock)+Number(value.sort!=="default");

export function CatalogBrowser({products,slug,food=false,approach="collection",filterLabel="Фильтры"}:{products:Product[];slug:string;food?:boolean;approach?:CommerceApproach;filterLabel?:string}) {
  const [filters,setFilters]=useState<CatalogFilters>(emptyCatalogFilters);
  const [draft,setDraft]=useState<CatalogFilters>(emptyCatalogFilters);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const searchRef=useRef<HTMLInputElement>(null);
  const id=useId();
  const categories=useMemo(()=>Array.from(new Set(products.map(p=>p.category).filter(Boolean))),[products]);
  const sizes=useMemo(()=>Array.from(new Set(products.flatMap(p=>p.variants.map(v=>v.size).filter((v):v is string=>Boolean(v))))),[products]);
  const visible=useMemo(()=>filterCatalog(products,filters),[products,filters]);
  const controls="min-h-11 w-full rounded-xl border border-current/20 bg-[var(--store-surface)] px-3 py-2 text-sm text-[var(--store-ink)]";
  const activeCount=nonQueryFilterCount(filters);
  const active=Boolean(filters.query||activeCount);
  useEffect(()=>{if(searchOpen)requestAnimationFrame(()=>searchRef.current?.focus());},[searchOpen]);
  useEffect(()=>{if(!filtersOpen)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setFiltersOpen(false);};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);},[filtersOpen]);
  const openFilters=()=>{setDraft(filters);setFiltersOpen(true);};
  const clearAll=()=>{setFilters(emptyCatalogFilters);setDraft(emptyCatalogFilters);};

  return <div className="relative" data-catalog-tools={approach}>
    {food&&categories.length>1&&<nav className="food-category-strip" aria-label="Разделы меню"><button type="button" aria-pressed={!filters.category} onClick={()=>setFilters(value=>({...value,category:""}))}>Всё меню</button>{categories.map(category=><button key={category} type="button" aria-pressed={filters.category===category} onClick={()=>setFilters(value=>({...value,category}))}>{category}</button>)}</nav>}
    <div className="relative mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" aria-label="Поиск и фильтры каталога">
      <div className="flex min-w-0 items-baseline">
        <h2 className="text-3xl font-semibold tracking-[-0.035em]">{food?"Меню":"Каталог"}</h2>
      </div>
      <div className="flex min-h-12 items-center justify-end gap-2">
      <div className={`grid min-h-12 items-center rounded-[var(--store-button-radius)] border border-current/15 bg-[var(--store-surface)] ${searchOpen?"w-full grid-cols-[auto_minmax(0,1fr)_auto] sm:w-80":"grid-cols-1"}`}>
        {searchOpen?<><Search className="ml-3 opacity-55" size={18}/><label className="sr-only" htmlFor={`${id}-search`}>{food?"Поиск по меню":"Поиск товаров"}</label><input ref={searchRef} id={`${id}-search`} type="search" value={filters.query} onChange={event=>setFilters(value=>({...value,query:event.target.value}))} placeholder={food?"Название или состав":"Название или описание"} className="h-12 min-w-0 bg-transparent px-3 text-sm outline-none"/><button type="button" className="grid size-11 place-items-center" aria-label={filters.query?"Очистить поиск":"Закрыть поиск"} onClick={()=>filters.query?setFilters(value=>({...value,query:""})):setSearchOpen(false)}><X size={18}/></button></>:<button type="button" className="flex min-h-11 items-center gap-2 px-4 text-sm font-bold" aria-expanded={searchOpen} onClick={()=>setSearchOpen(true)}><Search size={18}/>Поиск</button>}
      </div>
      {!searchOpen&&<button type="button" aria-expanded={filtersOpen} aria-controls={`${id}-filters`} onClick={openFilters} className="relative flex min-h-12 items-center gap-2 rounded-[var(--store-button-radius)] border border-current/15 bg-[var(--store-surface)] px-4 text-sm font-bold"><SlidersHorizontal size={18}/>{filterLabel}{activeCount>0&&<span className="grid size-5 place-items-center rounded-full bg-[var(--tenant-accent)] text-[11px] text-[var(--store-accent-ink)]" aria-label={`Активных фильтров: ${activeCount}`}>{activeCount}</span>}</button>}
      {filtersOpen&&<><button type="button" className="fixed inset-0 z-40 bg-black/35 md:hidden" aria-label="Закрыть фильтры" onClick={()=>setFiltersOpen(false)}/><section id={`${id}-filters`} role="dialog" aria-modal="true" aria-labelledby={`${id}-filter-title`} className="fixed inset-x-0 bottom-0 z-50 max-h-[82dvh] overflow-y-auto rounded-t-3xl border border-current/10 bg-[var(--store-surface)] p-5 shadow-2xl md:absolute md:inset-auto md:right-0 md:top-14 md:w-[420px] md:rounded-[var(--store-card-radius)]">
        <div className="flex items-center justify-between gap-3"><div><h3 id={`${id}-filter-title`} className="text-lg font-bold">Фильтры</h3><p className="mt-1 text-xs opacity-60">Изменения применятся после подтверждения</p></div><button type="button" className="grid size-11 place-items-center" aria-label="Закрыть фильтры" onClick={()=>setFiltersOpen(false)}><X size={20}/></button></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-1">
          {categories.length>1&&<label className="grid gap-2 text-sm font-bold">Категория<select value={draft.category} onChange={event=>setDraft(value=>({...value,category:event.target.value}))} className={controls}><option value="">Все категории</option>{categories.map(category=><option key={category}>{category}</option>)}</select></label>}
          {sizes.length>1&&<label className="grid gap-2 text-sm font-bold">Размер / вариант<select value={draft.size} onChange={event=>setDraft(value=>({...value,size:event.target.value}))} className={controls}><option value="">Все варианты</option>{sizes.map(size=><option key={size}>{size}</option>)}</select></label>}
          <label className="grid gap-2 text-sm font-bold">Порядок<select value={draft.sort} onChange={event=>setDraft(value=>({...value,sort:event.target.value as CatalogFilters["sort"]}))} className={controls}><option value="default">Как в каталоге</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option></select></label>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-current/15 px-3 text-sm font-bold"><input type="checkbox" checked={draft.inStock} onChange={event=>setDraft(value=>({...value,inStock:event.target.checked}))} className="size-5 accent-[var(--tenant-accent)]"/>Только в наличии</label>
        </div>
        <div className="sticky bottom-0 mt-6 grid grid-cols-2 gap-3 bg-[var(--store-surface)] pt-3"><button type="button" className="min-h-11 rounded-[var(--store-button-radius)] border border-current/20 px-4 font-bold" onClick={()=>setDraft({...emptyCatalogFilters,query:filters.query})}>Сбросить</button><button type="button" className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--store-button-radius)] bg-[var(--tenant-accent)] px-4 font-bold text-[var(--store-accent-ink)]" onClick={()=>{setFilters(draft);setFiltersOpen(false);}}><Check size={18}/>Применить</button></div>
      </section></>}
      </div>
    </div>
    {active&&<div className="mb-5 flex min-h-6 flex-wrap items-center gap-4 text-sm"><span role="status" aria-live="polite">Поиск и фильтры применены</span><button type="button" onClick={clearAll} className="min-h-11 underline underline-offset-4">Сбросить поиск и фильтры</button></div>}
    {visible.length?<div className="storefront-product-grid">{visible.map(product=>food?<FoodProductCard key={product.id} product={product} slug={slug}/>:<ProductCard key={product.id} product={product} slug={slug}/>)}</div>:<div className="rounded-[var(--store-card-radius)] border border-dashed border-current/20 px-5 py-12 text-center"><h3 className="text-lg font-semibold">Ничего не найдено</h3><p className="mt-2 opacity-70">Измените запрос или сбросьте фильтры.</p><button type="button" onClick={clearAll} className="mt-4 min-h-11 rounded-[var(--store-button-radius)] bg-[var(--tenant-accent)] px-5 font-bold text-[var(--store-accent-ink)]">Показать весь каталог</button></div>}
  </div>;
}
