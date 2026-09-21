import Link from "next/link";
import { ArrowRight, RefreshCw, Truck } from "lucide-react";
import { CatalogBrowser } from "@/components/store/catalog-browser";
import { nichePresets } from "@/lib/niche-presets";
import type { Product } from "@/lib/demo-data";
import type { Database, BusinessVertical } from "@/types/database";
import { approachForTemplate, configurationFor, type CommerceApproach } from "@/lib/commerce-configurations";
import styles from "./commerce-layouts.module.css";
import { storefrontPath } from "@/lib/storefront-path";
import { EditorialCover } from "./editorial-cover";
import { personalStoreLayout } from "@/lib/personal-store-layout";
import { FoodFulfilmentGate } from "./food-fulfilment-gate";
import { FoodQuickMenu } from "./food-quick-menu";
import { FoodStoryRail } from "./food-story-rail";
import type { FoodStory } from "@/lib/food-stories";

type Settings = Database["public"]["Tables"]["tenant_storefront_settings"]["Row"];
type Campaign = Pick<Database["public"]["Tables"]["storefront_campaigns"]["Row"],"title"|"eyebrow"|"body"|"cta_label"|"cta_href"|"image_url">;
export type StoreHomeProps = {
  slug:string;
  tenant:{name:string;catalog_name:string|null;tagline:string|null;business_vertical:BusinessVertical|null};
  products:Product[];
  settings:Settings|null;
  campaign:Campaign|null;
  storePolicies:{delivery_policy:string|null;return_policy:string|null}|null;
  approach?:CommerceApproach;
  checkoutOptions?:{deliveryEnabled:boolean;pickupEnabled:boolean};
  foodStories?: FoodStory[];
};
// Same render tree for authenticated draft preview and the published homepage.
export function StoreHome({slug,tenant,products,settings,campaign,storePolicies,approach:requestedApproach,checkoutOptions,foodStories}:StoreHomeProps) {
  const layout=personalStoreLayout(settings?.layout_config);
  const approach=requestedApproach??approachForTemplate(settings?.template_key??"atelier");
  const configuration=configurationFor(tenant.business_vertical??"other",approach);
  const categories=Array.from(new Set(products.map(p=>p.category).filter(Boolean)));
  const preset = nichePresets[tenant.business_vertical ?? "other"];
  const title = settings?.hero_title || tenant.catalog_name || tenant.name;
  const subtitle = settings?.hero_subtitle || tenant.tagline || preset.headline;
  const heroImage = settings?.hero_image_url && /^https?:\/\//.test(settings.hero_image_url) ? settings.hero_image_url : null;
  const campaignImage = campaign?.image_url?.startsWith("https://") ? campaign.image_url : null;
  const food=tenant.business_vertical==="food";

  if(food&&(approach==="assortment"||approach==="collection"))return <main className={`storefront-theme ${approach==="collection"?"bg-[#faf9f6]":"bg-white"}`} data-approach={approach} data-vertical="food">
    {approach==="collection"&&<section className="container pb-8 pt-7" aria-label="Галерея кафе"><div className="rounded-3xl bg-[#182a37] p-5 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#c9d6de]">{tenant.name}</p><h1 className="mt-3 max-w-lg text-3xl font-semibold leading-tight sm:text-5xl">{title}</h1><p className="mt-3 max-w-xl text-sm text-[#d4dce1] sm:text-base">{subtitle}</p><a href="#catalog" className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold" style={{color:"#182a37"}}>Смотреть меню →</a><div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">{products.filter(product=>product.images?.[0]).slice(0,3).map((product,index)=><Link key={product.id} href={`${storefrontPath(slug)}/product/${product.id}`} className={`overflow-hidden rounded-lg border-2 border-[#c3b59a] bg-[#edf0ef] ${index===0?"col-span-2 row-span-2":""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={product.images![0]} alt={product.title} className="aspect-square h-full w-full object-cover" loading={index===0?"eager":"lazy"}/>
    </Link>)}</div></div></section>}
    {checkoutOptions&&<FoodFulfilmentGate slug={slug} deliveryEnabled={checkoutOptions.deliveryEnabled} pickupEnabled={checkoutOptions.pickupEnabled}/>}
    <div id="catalog" style={{paddingTop:0}}><FoodQuickMenu products={products} slug={slug} name={tenant.catalog_name||tenant.name} curatedStories={foodStories} premium={approach==="collection"}/></div>
    {campaign&&<section className="container pb-8"><div className="rounded-3xl bg-[#eeeafa] p-6 text-[#352665]">{campaign.eyebrow&&<span className="text-sm">{campaign.eyebrow}</span>}<h2 className="mt-2 text-2xl font-bold">{campaign.title}</h2>{campaign.body&&<p className="mt-3">{campaign.body}</p>}<Link className="mt-4 inline-block font-semibold underline" href={campaign.cta_href||"#catalog"}>{campaign.cta_label||"Посмотреть меню"} →</Link></div></section>}
    {storePolicies?.delivery_policy&&<section className="container border-t py-8"><h2 className="font-semibold">Доставка и самовывоз</h2><p className="mt-3 whitespace-pre-line text-sm opacity-70">{storePolicies.delivery_policy}</p></section>}
    {storePolicies?.return_policy&&<section className="container border-t py-8"><h2 className="font-semibold">Условия магазина</h2><p className="mt-3 whitespace-pre-line text-sm opacity-70">{storePolicies.return_policy}</p></section>}
  </main>;

  return <main className={`storefront-theme ${styles.root}`} data-personal={layout?"true":undefined} data-typography={layout?.typography} data-hero={layout?.hero} data-density={layout?.density} data-columns={layout?.columns} data-corners={layout?.corners} data-ratio={layout?.imageRatio} data-approach={approach} data-template={settings?.template_key ?? "atelier"} data-vertical={tenant.business_vertical ?? "other"}>
    {(layout?layout.hero==="editorial":approach==="collection")?<EditorialCover vertical={tenant.business_vertical??"other"} title={title} subtitle={subtitle} cta={settings?.hero_cta_label||"Смотреть каталог"} heroImage={heroImage} products={products} slug={slug}/>:<header className={`container ${styles.intro}`}><div><span className={styles.sectionCount}>{categories.length>0?`${categories.length} разделов · ${products.length} товаров`:"Каталог магазина"}</span><h1>{title}</h1><p>{subtitle}</p></div>{approach==="assortment"&&categories.length>0&&<nav className={styles.quickSections} aria-label="Быстрый выбор раздела">{categories.map(category=><Link key={category} href={`${storefrontPath(slug)}/category/${encodeURIComponent(category)}`}>{category}<ArrowRight size={16}/></Link>)}</nav>}</header>}
    {food&&<div className="container pt-6"><FoodStoryRail products={products} slug={slug} name={tenant.catalog_name||tenant.name} curatedStories={foodStories}/></div>}

    {approach==="guided"&&categories.length>0&&<section className="container pb-8" aria-label="Выбор раздела"><h2 className="mb-6 text-2xl font-semibold">{configuration?.title??"Выберите раздел"}</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-3">{categories.map(category=>{const product=products.find(p=>p.category===category&&p.images?.[0]);return <Link key={category} href={`${storefrontPath(slug)}/category/${encodeURIComponent(category)}`} className="overflow-hidden rounded-2xl border border-black/10 bg-[var(--store-surface)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {product&&<img src={product.images![0]} alt={category} className="aspect-[4/3] w-full object-cover" loading="lazy"/>}<span className="flex items-center justify-between p-5 font-semibold">{category}<ArrowRight size={18}/></span>
    </Link>})}</div></section>}

    {campaign && <section className="container pt-6"><div className={`storefront-campaign ${campaignImage ? "has-image" : ""}`} style={campaignImage ? { backgroundImage: `linear-gradient(90deg, rgba(2, 19, 15, .94) 0%, rgba(2, 19, 15, .76) 55%, rgba(2, 19, 15, .2) 100%), url(${campaignImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><div>
      {campaign.eyebrow && <span>{campaign.eyebrow}</span>}<h2>{campaign.title}</h2>{campaign.body && <p>{campaign.body}</p>}
    </div><Link href={campaign.cta_href || "#catalog"}>{campaign.cta_label}<ArrowRight size={17} /></Link></div></section>}

    {food&&checkoutOptions&&<FoodFulfilmentGate slug={slug} deliveryEnabled={checkoutOptions.deliveryEnabled} pickupEnabled={checkoutOptions.pickupEnabled}/>}
    <section id="catalog" className="container py-20">
      <div className="mb-10 flex items-end justify-between gap-6"><h2 className="text-4xl font-semibold tracking-[-.035em]">{food?"Меню":"Каталог"}</h2><span className="hidden text-sm font-bold opacity-60 md:block">{products.length} {food?"позиций":"товаров"}</span></div>
      {products.length ? <CatalogBrowser products={products} slug={slug} food={food}/> : <div className="rounded-2xl border border-dashed border-black/20 py-16 text-center"><h3 className="text-xl font-bold">{food?"Меню наполняется":"Каталог наполняется"}</h3><p className="mt-2 opacity-60">{food?"Заведение добавляет первые блюда и напитки.":"Владелец магазина добавляет первые товары."}</p></div>}
    </section>

    {(storePolicies?.delivery_policy || storePolicies?.return_policy) && <section className="container grid gap-5 py-16 md:grid-cols-2"><div><h2 className="text-3xl font-semibold tracking-[-.035em]">Условия магазина</h2><p className="mt-2 max-w-lg text-[var(--store-muted)]">Актуальная информация от продавца.</p></div><div className="grid gap-4">{storePolicies.delivery_policy && <article className="rounded-xl border border-black/10 bg-[var(--store-surface)] p-5"><div className="flex items-center gap-2 font-extrabold"><Truck size={18} />Доставка</div><p className="mt-3 whitespace-pre-line text-sm leading-6 opacity-75">{storePolicies.delivery_policy}</p></article>}{storePolicies.return_policy && <article className="rounded-xl border border-black/10 bg-[var(--store-surface)] p-5"><div className="flex items-center gap-2 font-extrabold"><RefreshCw size={18} />Обмен и возврат</div><p className="mt-3 whitespace-pre-line text-sm leading-6 opacity-75">{storePolicies.return_policy}</p></article>}</div></section>}
  </main>;
}
