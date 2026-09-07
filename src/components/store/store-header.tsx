"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";

export function StoreHeader({ slug, name, categories = [], demo = false }: { slug: string; name: string; categories?: string[]; demo?: boolean }) {
  const { count } = useCart();
  const pathname = usePathname();
  const base = `/s/${slug}`;
  const links = [{ label: "Все товары", href: `${base}/catalog` }, ...categories.map(label => ({ label, href: `${base}/category/${encodeURIComponent(label)}` }))];
  return <header className="sticky top-0 z-30 border-b border-black/10 bg-[var(--store-surface)]">
    {demo && <div className="border-b border-black/10"><div className="container flex flex-wrap justify-between gap-3 py-3 text-xs"><Link href="/demo">← Другие примеры</Link><span className="hidden opacity-50 sm:inline">Демонстрационный каталог</span><Link href="/admin/ai-studio" className="font-semibold">К созданию каталога →</Link></div></div>}
    <div className="container flex h-20 items-center justify-between"><Link href={base} className="text-2xl font-semibold tracking-[.12em]">{name}</Link><Link aria-label={`Корзина, ${count} товаров`} className="flex items-center gap-2 p-3" href={`${base}/cart`}><ShoppingBag size={20}/><span className="text-sm">{count}</span></Link></div>
    <nav aria-label="Разделы магазина" className="container flex gap-7 overflow-x-auto pb-4 text-sm">{links.map(link => <Link key={link.href} href={link.href} aria-current={decodeURI(pathname) === decodeURI(link.href) ? "page" : undefined} className="shrink-0 border-b-2 border-transparent pb-1 opacity-60 hover:opacity-100 aria-[current=page]:border-current aria-[current=page]:opacity-100">{link.label}</Link>)}</nav>
  </header>;
}
