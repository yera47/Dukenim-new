"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Gift, ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";
import { storefrontPath } from "@/lib/storefront-path";

type Props = { slug: string; name: string; logoUrl?: string | null; categories?: string[]; demo?: boolean; food?: boolean; quickFood?: boolean; concept?: boolean };

export function StoreHeader({ slug, name, logoUrl, categories = [], demo = false, food = false, quickFood = false, concept = false }: Props) {
  const { count } = useCart();
  const pathname = usePathname();
  const base = storefrontPath(slug);
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[0-9a-f-]{36}$/i.test(ref)) try { window.localStorage.setItem(`dukenim:${slug}:referral`, ref); } catch { /* storage may be unavailable */ }
  }, [slug]);

  if (quickFood) return <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur"><div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between gap-2 px-3 sm:px-6"><Link href={base} title={name} className="flex min-w-0 items-center gap-2 text-base font-extrabold tracking-tight text-[var(--accent)] sm:text-xl">{logoUrl ? <Image src={logoUrl} alt="" width={36} height={36} unoptimized className="h-9 w-9 shrink-0 rounded-lg object-contain" /> : null}<span className="truncate">{name}</span></Link><div className="flex shrink-0 items-center gap-1.5 sm:gap-2"><Link aria-label="Мои заказы" title="Мои заказы" className="grid size-11 place-items-center rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm transition hover:-translate-y-px hover:shadow-md" href={`${base}/orders`}><Gift size={18} /></Link><a aria-label={`Корзина, товаров: ${count}`} title="Корзина" className="relative grid size-11 place-items-center rounded-full bg-[var(--accent)] shadow-md shadow-slate-900/10 transition hover:bg-[var(--accent-dark)]" style={{ color: "#fff" }} href={`${base}/cart`}><ShoppingBag size={19} />{count > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-white text-[10px] font-black text-[var(--accent)] shadow">{count}</span>}</a></div></div></header>;

  const links = [{ label: food ? "Меню" : "Все товары", href: `${base}/catalog` }, ...(!food ? categories.map((label) => ({ label, href: `${base}/category/${encodeURIComponent(label)}` })) : [])];
  return <header className="storefront-header sticky top-0 z-30 border-b border-black/10 bg-[var(--store-surface)]/95 backdrop-blur-xl">
    {demo && <div className="border-b border-black/10"><div className="container flex flex-wrap justify-between gap-3 py-3 text-xs"><Link href="/demo">← Другие примеры</Link><span className="hidden opacity-50 sm:inline">Демонстрационная витрина</span><Link href="/register" className="font-semibold">Создать магазин →</Link></div></div>}
    <div className={`container flex min-w-0 items-center justify-between gap-2 ${concept ? "min-h-16 py-2" : "min-h-20 py-3"}`}><Link href={base} className="flex min-w-0 flex-1 items-center gap-3 text-xl font-extrabold sm:text-2xl">{logoUrl ? <span className="flex h-12 min-w-12 max-w-28 items-center rounded-[var(--store-card-radius)] bg-white/75 px-1.5"><Image src={logoUrl} alt={`Логотип ${name}`} width={96} height={48} unoptimized className="h-10 w-auto max-w-full shrink-0 object-contain" /></span> : null}<span className="truncate">{name}</span></Link><div className="flex shrink-0 items-center gap-2">{!demo && <Link aria-label="Мои заказы" href={`${base}/orders`} className="flex min-h-11 items-center gap-2 border border-[var(--tenant-accent)] px-3 text-sm font-bold" style={{ borderRadius: "var(--store-button-radius)" }}><Gift size={17} /><span className="hidden sm:inline">Мои заказы</span></Link>}<a aria-label={`Корзина, товаров: ${count}`} className="flex min-h-11 items-center gap-2 bg-[var(--tenant-accent)] px-3" style={{ borderRadius: "var(--store-button-radius)", color: "var(--store-accent-ink)" }} href={`${base}/cart`}><ShoppingBag size={20} /><span className="text-sm font-bold">{count}</span></a></div></div>
    <nav aria-label="Разделы магазина" className={`container flex gap-7 overflow-x-auto text-sm ${concept ? "pb-2" : "pb-4"}`}>{links.map((link) => <Link key={link.href} href={link.href} aria-current={decodeURI(pathname) === decodeURI(link.href) ? "page" : undefined} className="shrink-0 border-b-2 border-transparent pb-1 opacity-60 hover:opacity-100 aria-[current=page]:border-current aria-[current=page]:opacity-100">{link.label}</Link>)}</nav>
  </header>;
}
