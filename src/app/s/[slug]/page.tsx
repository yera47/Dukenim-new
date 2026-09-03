import Link from "next/link";
import { ArrowRight, RefreshCw, ShieldCheck, Truck } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { resolveTenant } from "@/lib/tenant";
import { loadProducts } from "@/lib/storefront-data";
import { createClient } from "@/lib/supabase/server";
import { getStorefrontSettings, getTenantSettings } from "@/lib/queries/owner";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant) return null;

  const products = await loadProducts(tenant.id);
  const client = process.env.NEXT_PUBLIC_SUPABASE_URL ? await createClient() : null;
  const settings = client ? (await getStorefrontSettings(client, tenant.id)).data : null;
  const storePolicies = client ? (await getTenantSettings(client, tenant.id)).data : null;
  const campaign = client
    ? (await client.from("storefront_campaigns").select("title, eyebrow, body, cta_label, cta_href").eq("tenant_id", tenant.id).eq("status", "published").order("created_at", { ascending: false }).limit(1).maybeSingle()).data
    : null;
  const title = settings?.hero_title || tenant.name;
  const subtitle = settings?.hero_subtitle || tenant.tagline || "Собранный каталог, удобный заказ и понятная связь с магазином.";
  const heroImage = settings?.hero_image_url && /^https?:\/\//.test(settings.hero_image_url) ? settings.hero_image_url : null;
  const heroStyle = heroImage ? { backgroundImage: `linear-gradient(100deg, var(--store-bg) 0%, transparent 66%), url(${heroImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;

  return <main className="storefront-theme">
    <section className="container mt-6 overflow-hidden rounded-[28px] border border-black/10 bg-[var(--store-surface)]" style={heroStyle}>
      <div className="storefront-hero-grid min-h-[580px] p-8 md:p-14">
        <div className="flex max-w-xl flex-col justify-center">
          <h1 className="text-5xl font-semibold leading-[.96] tracking-[-.04em] md:text-7xl">{title}</h1>
          <p className="mt-7 max-w-[52ch] text-lg leading-8 opacity-70">{subtitle}</p>
          <Link className="mt-8 inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--tenant-accent)] px-5 py-3.5 font-extrabold text-[var(--store-accent-ink)] transition-transform hover:-translate-y-0.5" href="#catalog">
            {settings?.hero_cta_label || "Смотреть каталог"}<ArrowRight size={18} />
          </Link>
        </div>
        <div className="storefront-hero-object" aria-hidden="true"><div /><div /><div /></div>
      </div>
    </section>

    {campaign && <section className="container pt-6"><div className="storefront-campaign"><div>
      {campaign.eyebrow && <span>{campaign.eyebrow}</span>}<h2>{campaign.title}</h2>{campaign.body && <p>{campaign.body}</p>}
    </div><Link href={campaign.cta_href || "#catalog"}>{campaign.cta_label}<ArrowRight size={17} /></Link></div></section>}

    <section id="catalog" className="container py-20">
      <div className="mb-10 flex items-end justify-between gap-6"><h2 className="text-4xl font-semibold tracking-[-.035em]">Каталог</h2><span className="hidden text-sm font-bold opacity-60 md:block">{products.length} товаров</span></div>
      {products.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-6">{products.map((product) => <ProductCard key={product.id} product={product} slug={slug} />)}</div> : <div className="rounded-2xl border border-dashed border-black/20 py-16 text-center"><h3 className="text-xl font-bold">Каталог наполняется</h3><p className="mt-2 opacity-60">Владелец магазина добавляет первые товары.</p></div>}
    </section>

    <section id="about" className="bg-[var(--tenant-accent)] py-20 text-[var(--store-accent-ink)]"><div className="container grid gap-10 md:grid-cols-2">
      <h2 className="text-4xl font-semibold tracking-[-.04em] md:text-5xl">Магазин, к которому хочется вернуться.</h2>
      <div><p className="max-w-[50ch] text-lg leading-8 opacity-80">Товары, оформление заказа и связь с владельцем собраны в одном понятном маршруте.</p><div className="mt-10 grid grid-cols-3 gap-5 text-sm"><div><Truck /><b className="mt-3 block">Доставка</b></div><div><ShieldCheck /><b className="mt-3 block">Безопасно</b></div><div><RefreshCw /><b className="mt-3 block">Обмен</b></div></div></div>
    </div></section>
    {(storePolicies?.delivery_policy || storePolicies?.return_policy) && <section className="container grid gap-5 py-16 md:grid-cols-2"><div><h2 className="text-3xl font-semibold tracking-[-.035em]">Условия магазина</h2><p className="mt-2 max-w-lg text-[var(--store-muted)]">Актуальная информация от продавца.</p></div><div className="grid gap-4">{storePolicies.delivery_policy && <article className="rounded-xl border border-black/10 bg-[var(--store-surface)] p-5"><div className="flex items-center gap-2 font-extrabold"><Truck size={18} />Доставка</div><p className="mt-3 whitespace-pre-line text-sm leading-6 opacity-75">{storePolicies.delivery_policy}</p></article>}{storePolicies.return_policy && <article className="rounded-xl border border-black/10 bg-[var(--store-surface)] p-5"><div className="flex items-center gap-2 font-extrabold"><RefreshCw size={18} />Обмен и возврат</div><p className="mt-3 whitespace-pre-line text-sm leading-6 opacity-75">{storePolicies.return_policy}</p></article>}</div></section>}
  </main>;
}
