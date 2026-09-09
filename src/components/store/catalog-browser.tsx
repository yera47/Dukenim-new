"use client";
import { useId, useMemo, useState } from "react";
import type { Product } from "@/lib/demo-data";
import { emptyCatalogFilters, filterCatalog, type CatalogFilters } from "@/lib/catalog-filter";
import { ProductCard } from "./product-card";

export function CatalogBrowser({products,slug}:{products:Product[];slug:string}) {
  const [filters,setFilters]=useState<CatalogFilters>(emptyCatalogFilters);
  const id=useId();
  const categories=useMemo(()=>Array.from(new Set(products.map(p=>p.category).filter(Boolean))),[products]);
  const sizes=useMemo(()=>Array.from(new Set(products.flatMap(p=>p.variants.map(v=>v.size).filter((v):v is string=>Boolean(v))))),[products]);
  const visible=useMemo(()=>filterCatalog(products,filters),[products,filters]);
  const change=<K extends keyof CatalogFilters>(key:K,value:CatalogFilters[K])=>setFilters(previous=>({...previous,[key]:value}));
  const controls="min-h-11 w-full rounded-xl border border-current/20 bg-[var(--store-surface)] px-3 py-2 text-sm text-[var(--store-ink)]";
  const active=Boolean(filters.query||filters.category||filters.size||filters.inStock||filters.sort!=="default");
  return <div>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="grid gap-2 text-sm" htmlFor={`${id}-search`}>Найти товар<input id={`${id}-search`} type="search" value={filters.query} onChange={e=>change("query",e.target.value)} placeholder="Название или описание" className={controls}/></label>
      {categories.length>1&&<label className="grid gap-2 text-sm">Категория<select value={filters.category} onChange={e=>change("category",e.target.value)} className={controls}><option value="">Все категории</option>{categories.map(category=><option key={category}>{category}</option>)}</select></label>}
      {sizes.length>1&&<label className="grid gap-2 text-sm">Размер / вариант<select value={filters.size} onChange={e=>change("size",e.target.value)} className={controls}><option value="">Все варианты</option>{sizes.map(size=><option key={size}>{size}</option>)}</select></label>}
      <label className="grid gap-2 text-sm">Порядок<select value={filters.sort} onChange={e=>change("sort",e.target.value as CatalogFilters["sort"])} className={controls}><option value="default">Как в магазине</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option></select></label>
    </div>
    <div className="mb-6 flex flex-wrap items-center gap-4 text-sm"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={filters.inStock} onChange={e=>change("inStock",e.target.checked)} className="h-4 w-4 accent-current"/>Только в наличии</label><span role="status" aria-live="polite">Найдено: {visible.length}</span>{active&&<button type="button" onClick={()=>setFilters(emptyCatalogFilters)} className="min-h-11 underline underline-offset-4">Сбросить фильтры</button>}</div>
    {visible.length?<div className="storefront-product-grid">{visible.map(product=><ProductCard key={product.id} product={product} slug={slug}/>)}</div>:<div className="rounded-2xl border border-dashed border-current/20 px-5 py-12 text-center"><h3 className="text-lg font-semibold">Ничего не найдено</h3><p className="mt-2 opacity-70">Измените запрос или сбросьте фильтры.</p></div>}
  </div>;
}
