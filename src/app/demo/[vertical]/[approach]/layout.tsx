import Link from "next/link";
import { notFound } from "next/navigation";
import { configurationFor } from "@/lib/commerce-configurations";
import { demoProductsFor } from "@/lib/demo-catalogs";
import { configurationSlug } from "@/lib/storefront-path";
import { storefrontStyle } from "@/lib/storefront-style";
import { CartProvider } from "@/components/store/cart-provider";
import { StoreHeader } from "@/components/store/store-header";
import styles from "@/components/store/commerce-layouts.module.css";

export default async function DemoLayout({params,children}:{params:Promise<{vertical:string;approach:string}>;children:React.ReactNode}) {
  const {vertical,approach}=await params;
  const config=configurationFor(vertical,approach);if(!config)notFound();
  const products=demoProductsFor(config.vertical);
  return <div className={`storefront-theme ${styles.root}`} data-approach={approach} data-vertical={vertical} style={storefrontStyle(null,"standard","#171717")}>
    <div className="border-b bg-neutral-100 px-6 py-4 text-sm"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><Link href={`/demo/${vertical}`}>← Выбрать другой вариант</Link><span>{config.title} · Демо</span><Link href="/admin/ai-studio">Создать свой магазин →</Link></div></div>
    <CartProvider key={config.id}><StoreHeader slug={configurationSlug(vertical,approach)} name={`Dukenim ${vertical[0].toUpperCase()+vertical.slice(1)} Shop`} categories={Array.from(new Set(products.map(p=>p.category)))}/>{children}</CartProvider>
  </div>;
}
