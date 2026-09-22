import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CartProvider } from "@/components/store/cart-provider";
import { StoreHeader } from "@/components/store/store-header";
import { InstallPrompt } from "@/components/store/install-prompt";
import { resolveTenant } from "@/lib/tenant";
import { loadStoreCategories } from "@/lib/storefront-data";
import { demoVerticalById } from "@/lib/demo-catalogs";
import { createClient } from "@/lib/supabase/server";
import { getStorefrontSettings } from "@/lib/queries/owner";
import { storefrontStyle } from "@/lib/storefront-style";
import {approachForTemplate} from "@/lib/commerce-configurations";
import compositionStyles from "@/components/store/commerce-layouts.module.css";
import { YandexDeliveryNotice } from "@/components/store/yandex-delivery-notice";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const tenant = await resolveTenant(slug);
  return tenant ? { title: tenant.name, description: tenant.tagline ?? `Магазин ${tenant.name}`, manifest: `/s/${slug}/manifest.webmanifest` } : {};
}
export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params; const tenant = await resolveTenant(slug); if (!tenant) notFound();
  const demo = Boolean(demoVerticalById(tenant.id));
  const client = !demo && process.env.NEXT_PUBLIC_SUPABASE_URL ? await createClient() : null;
  const [settingsResult, yandexZone, paymentResult, categories] = await Promise.all([
    client ? getStorefrontSettings(client, tenant.id) : Promise.resolve(null),
    client ? client.from("delivery_zones").select("id").eq("tenant_id", tenant.id).eq("is_active", true).eq("provider", "yandex").limit(1) : Promise.resolve(null),
    client ? client.from("tenant_settings").select("delivery_enabled,kaspi_remote_enabled").eq("tenant_id",tenant.id).maybeSingle() : Promise.resolve(null),
    tenant.business_vertical === "food" ? Promise.resolve([]) : loadStoreCategories(tenant.id),
  ]);
  const settings = settingsResult?.data ?? null;
  const style = storefrontStyle(settings,tenant.plan,tenant.accent_color,demo);
  return <div style={style} data-vertical={tenant.business_vertical??"other"} data-approach={approachForTemplate(settings?.template_key??"atelier")} className={`min-h-screen bg-[var(--store-bg)] text-[var(--store-ink)] ${compositionStyles.root}`}><CartProvider key={slug} storageKey={`store:${slug}`}><StoreHeader slug={slug} name={tenant.name} categories={categories} demo={demo} food={tenant.business_vertical==="food"} quickFood={tenant.business_vertical==="food"&&approachForTemplate(settings?.template_key??"atelier")==="assortment"}/>{children}{!demo && <InstallPrompt/>}<footer className="mt-16 border-t border-black/10 py-10"><div className="container flex flex-wrap justify-between gap-5 text-sm"><span>{tenant.name} · {tenant.city ?? "Казахстан"}</span><Link href="/register">Создать свой каталог на Dukenim →</Link><Link href="/legal/privacy">Конфиденциальность</Link></div></footer>{Boolean(paymentResult?.data?.delivery_enabled&&yandexZone?.data?.length) && <YandexDeliveryNotice slug={slug} storeName={tenant.name} kaspiRemoteEnabled={Boolean(paymentResult?.data?.kaspi_remote_enabled)}/>}</CartProvider></div>;
}
