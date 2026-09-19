"use client";
import {useEffect} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";
import { storefrontPath } from "@/lib/storefront-path";

export function StoreHeader({ slug, name, categories = [], demo = false, food = false, quickFood=false }: { slug: string; name: string; categories?: string[]; demo?: boolean; food?:boolean;quickFood?:boolean }) {
  const { count } = useCart();
  const pathname = usePathname();
  const base = storefrontPath(slug); useEffect(()=>{const ref=new URLSearchParams(window.location.search).get("ref");if(ref&&/^[0-9a-f-]{36}$/i.test(ref)){try{window.localStorage.setItem(`dukenim:${slug}:referral`,ref);}catch{}}},[slug]);
  if(quickFood)return <header className="sticky top-0 z-30 border-b border-black/5 bg-white"><div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-6"><Link href={base} className="min-w-0 truncate text-xl font-extrabold tracking-tight text-[#6650cf]">{name}</Link><div className="flex shrink-0 items-center gap-3">{<Link className="text-xs text-neutral-500" href={`${base}/orders`}>Мои заказы<br/><span className="text-[10px] opacity-60">и карта гостя</span></Link>}<a aria-label={`Корзина, ${count} товаров`} className="flex items-center gap-2 rounded-full bg-[#6650cf] px-4 py-3 text-sm font-semibold text-white" href={`${base}/cart`}><ShoppingBag size={18}/><span>{count||"Корзина"}</span></a></div></div></header>;
  const links = [{ label: food?"Меню":"Все товары", href: `${base}/catalog` }, ...(!food?categories.map(label => ({ label, href: `${base}/category/${encodeURIComponent(label)}` })):[]), ...(!demo?[{label:"Мои заказы",href:`${base}/orders`}]:[])];
  return <header className="sticky top-0 z-30 border-b border-black/10 bg-[var(--store-surface)]">
    {demo && <div className="border-b border-black/10"><div className="container flex flex-wrap justify-between gap-3 py-3 text-xs"><Link href="/demo">← Другие примеры</Link><span className="hidden opacity-50 sm:inline">Демонстрационный каталог</span><Link href="/admin/ai-studio" className="font-semibold">К созданию каталога →</Link></div></div>}
    <div className="container flex h-20 items-center justify-between"><Link href={base} className="text-2xl font-semibold tracking-[.12em]">{name}</Link><a aria-label={`Корзина, ${count} товаров`} className="flex items-center gap-2 p-3" href={`${base}/cart`}><ShoppingBag size={20}/><span className="text-sm">{count}</span></a></div>
    <nav aria-label="Разделы магазина" className="container flex gap-7 overflow-x-auto pb-4 text-sm">{links.map(link => <Link key={link.href} href={link.href} aria-current={decodeURI(pathname) === decodeURI(link.href) ? "page" : undefined} className="shrink-0 border-b-2 border-transparent pb-1 opacity-60 hover:opacity-100 aria-[current=page]:border-current aria-[current=page]:opacity-100">{link.label}</Link>)}</nav>
  </header>;
}
