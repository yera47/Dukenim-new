import Link from "next/link";
import { notFound } from "next/navigation";
import { configurationFor } from "@/lib/commerce-configurations";
import { approvedConceptDemoNames, approvedConceptDemoSettings, bulkaDemoSettings, demoProductsFor } from "@/lib/demo-catalogs";
import { configurationSlug } from "@/lib/storefront-path";
import { storefrontStyle } from "@/lib/storefront-style";
import { CartProvider } from "@/components/store/cart-provider";
import { StoreHeader } from "@/components/store/store-header";
import styles from "@/components/store/commerce-layouts.module.css";
import demoBrandAssets from "../../../../../shared/demo-brand-assets.json";

export default async function DemoLayout({ params, children }: { params: Promise<{ vertical: string; approach: string }>; children: React.ReactNode }) {
  const { vertical, approach } = await params;
  const config = configurationFor(vertical, approach);
  if (!config) notFound();
  const products = demoProductsFor(config.vertical);
  const bulkaFixture = vertical === "food" && approach === "collection";
  const conceptSettings = approvedConceptDemoSettings[config.vertical] ?? null;
  const referenceFixture = Boolean(conceptSettings || bulkaFixture);
  const name = approvedConceptDemoNames[config.vertical] ?? (bulkaFixture ? "Bulka · демо" : `Dukenim ${vertical[0].toUpperCase() + vertical.slice(1)} Shop`);
  const settings = conceptSettings ?? (bulkaFixture ? bulkaDemoSettings : null);
  const style = settings ? storefrontStyle(settings, "standard", settings.brand_color ?? "#171717") : storefrontStyle(null, "standard", "#171717");

  return <div className={`storefront-theme ${styles.root}`} data-approach={approach} data-vertical={vertical} data-reference-fixture={referenceFixture ? "true" : undefined} style={style}>
    <div className="border-b border-black/10 bg-[var(--store-surface)] px-3 py-2 text-[10px] sm:px-6 sm:text-xs"><div className="reference-demo-bar mx-auto flex min-w-0 max-w-6xl items-center justify-between gap-2"><Link className="shrink-0 font-semibold" href={`/demo/${vertical}`}>← Назад</Link><span className="min-w-0 truncate rounded-full bg-[var(--accent-soft)] px-3 py-1 font-bold uppercase tracking-[.08em] text-[var(--accent)]">Синтетическая демо-витрина</span><Link className="shrink-0 font-semibold" href="/register">Создать свою →</Link></div></div>
    <CartProvider key={config.id} storageKey={`demo:${config.id}`}><StoreHeader slug={configurationSlug(vertical, approach)} name={name} logoUrl={bulkaFixture ? demoBrandAssets.bulka : null} categories={Array.from(new Set(products.map((product) => product.category)))} food={vertical === "food"} quickFood={vertical === "food" && approach === "assortment"} demo={vertical === "food" && approach === "assortment"} concept={Boolean(conceptSettings)} />{children}</CartProvider>
  </div>;
}
