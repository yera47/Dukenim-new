"use client";
import {useEffect} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";
import { storefrontPath } from "@/lib/storefront-path";

export function StoreHeader({ slug, name, categories = [], demo = false, food = false, quickFood=false }: { slug: string; name: string; categories?: string[]; demo?: boolean; food?:boolean;quickFood?:boolean }) {
  const { count } = useCart();
  const pathname = usePathname();
  const base = storefrontPath(slug); useEffect(()=>{const ref=new URLSearchParams(window.location.search).get("ref");if(ref&&/^[0-9a-f-]{36}$/i.test(ref)){try{window.localStorage.setItem(`dukenim:${slug}:referral`,ref);}catch{}}},[slug]);
  if(quickFood)return <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur"><div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between gap-2 px-3 sm:px-6"><Link href={base} className="min-w-0 truncate text-xl font-extrabold tracking-tight text-[var(--accent)]">{name}</Link><div className="flex shrink-0 items-center gap-2"><Link className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 text-xs font-bold text-[var(--accent)] shadow-sm transition hover:-translate-y-px hover:shadow-md" href={`${base}/orders`}><Gift size={17}/><span>Мои заказы<span className="hidden text-[10px] font-medium opacity-70 sm:block">и карта гостя</span></span></Link><a aria-label={`Корзина, ${count} товаров`} className="flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-bold shadow-md shadow-slate-900/10 transition hover:bg-[var(--accent-dark)]" style={{color:"#fff"}} href={`${base}/cart`}><ShoppingBag size={18}/><span>{count||"Корзина"}</span></a></div></div></header>;
  const links = [{ label: food?"Меню":"Все товары", href: `${base}/catalog` }, ...(!food?categories.map(label => ({ label, href: `${base}/category/${encodeURIComponent(label)}` })):[]), ...(!demo?[{label:"Мои заказы",href:`${base}/orders`}]:[])];
  return <header className="sticky top-0 z-30 border-b border-black/10 bg-[var(--store-surface)]">
    {demo && <div className="border-b border-black/10"><div className="container flex flex-wrap justify-between gap-3 py-3 text-xs"><Link href="/demo">← Другие примеры</Link><span className="hidden opacity-50 sm:inline">Демонстрационный каталог</span><Link href="/admin/ai-studio" className="font-semibold">К созданию каталога →</Link></div></div>}
    <div className="container flex h-20 items-center justify-between gap-3"><Link href={base} className="min-w-0 truncate text-2xl font-semibold tracking-[.12em]">{name}</Link><div className="flex items-center gap-2">{!demo&&<Link href={`${base}/orders`} className="flex items-center gap-2 rounded-full border border-[var(--tenant-accent)] px-3 py-2 text-sm font-bold"><Gift size={17}/>Мои заказы</Link>}<a aria-label={`Корзина, ${count} товаров`} className="flex items-center gap-2 rounded-full bg-[var(--tenant-accent)] px-3 py-2" style={{color:"#fff"}} href={`${base}/cart`}><ShoppingBag size={20}/><span className="text-sm font-bold">{count}</span></a></div></div>
    <nav aria-label="Разделы магазина" className="container flex gap-7 overflow-x-auto pb-4 text-sm">{links.map(link => <Link key={link.href} href={link.href} aria-current={decodeURI(pathname) === decodeURI(link.href) ? "page" : undefined} className="shrink-0 border-b-2 border-transparent pb-1 opacity-60 hover:opacity-100 aria-[current=page]:border-current aria-[current=page]:opacity-100">{link.label}</Link>)}</nav>
  </header>;
}
