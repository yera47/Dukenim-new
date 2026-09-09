import Link from "next/link";
import { notFound } from "next/navigation";
import { commerceConfigurations, configurationFor } from "@/lib/commerce-configurations";
import { demoProductsFor, demoSlug } from "@/lib/demo-catalogs";
import { nichePresets } from "@/lib/niche-presets";
import { StoreHome } from "@/components/store/store-home";
import { CartProvider } from "@/components/store/cart-provider";
import { StoreHeader } from "@/components/store/store-header";
import { storefrontStyle } from "@/lib/storefront-style";
export function generateStaticParams(){return commerceConfigurations.map(({vertical,approach})=>({vertical,approach}));}
export default async function ConfigurationDemo({params}:{params:Promise<{vertical:string;approach:string}>}) {
  const {vertical,approach}=await params;
  const config=configurationFor(vertical,approach);if(!config)notFound();
  const products=demoProductsFor(config.vertical),slug=demoSlug(config.vertical);
  const name=`Dukenim ${config.vertical=== "other"?"Shop":config.vertical[0].toUpperCase()+config.vertical.slice(1)+" Shop"}`;
  return <div style={storefrontStyle(null,"standard","#171717")}>
    <div className="border-b bg-neutral-100 px-6 py-4 text-sm"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><Link href="/demo">← Все примеры</Link><span>{config.title} · Демонстрационные товары</span><Link href="/admin/ai-studio">К созданию магазина →</Link></div><p className="mx-auto mt-3 max-w-6xl text-neutral-600">{config.description}</p></div>
    <CartProvider><StoreHeader slug={slug} name={name} categories={Array.from(new Set(products.map(p=>p.category)))}/><StoreHome slug={slug} tenant={{name,catalog_name:name,tagline:nichePresets[config.vertical].headline,business_vertical:config.vertical}} products={products} settings={null} campaign={null} storePolicies={null} approach={config.approach}/></CartProvider>
  </div>;
}
