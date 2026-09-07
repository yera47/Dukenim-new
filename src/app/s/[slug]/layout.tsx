import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CartProvider } from "@/components/store/cart-provider";
import { StoreHeader } from "@/components/store/store-header";
import { InstallPrompt } from "@/components/store/install-prompt";
import { resolveTenant } from "@/lib/tenant";
import { loadProducts } from "@/lib/storefront-data";
import { demoVerticalById } from "@/lib/demo-catalogs";
import { createClient } from "@/lib/supabase/server";
import { getStorefrontSettings } from "@/lib/queries/owner";
import { paletteByKey, safeBrandColor } from "@/lib/storefront-theme";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const tenant = await resolveTenant(slug);
  return tenant ? { title: tenant.name, description: tenant.tagline ?? `Магазин ${tenant.name}`, manifest: `/s/${slug}/manifest.webmanifest` } : {};
}
export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params; const tenant = await resolveTenant(slug); if (!tenant) notFound();
  const demo = Boolean(demoVerticalById(tenant.id));
  const settings = !demo && process.env.NEXT_PUBLIC_SUPABASE_URL ? (await getStorefrontSettings(await createClient(), tenant.id)).data : null;
  const palette = demo ? { background: "#ffffff", surface: "#fafafa", ink: "#171717", muted: "#737373", accent: "#171717", accentInk: "#ffffff" } : paletteByKey(settings?.palette_key);
  const accent = demo || tenant.plan === "basic" ? palette.accent : safeBrandColor(settings?.brand_color, tenant.accent_color);
  const style = { "--tenant-accent": accent, "--store-bg": palette.background, "--store-surface": palette.surface, "--store-ink": palette.ink, "--store-muted": palette.muted, "--store-accent-ink": palette.accentInk } as CSSProperties;
  const products = await loadProducts(tenant.id);
  const categories = Array.from(new Set(products.map(product => product.category).filter(Boolean)));
  return <div style={style} className="min-h-screen bg-[var(--store-bg)] text-[var(--store-ink)]"><CartProvider key={slug}><StoreHeader slug={slug} name={tenant.name} categories={categories} demo={demo}/>{children}{!demo && <InstallPrompt/>}<footer className="mt-16 border-t border-black/10 py-10"><div className="container flex flex-wrap justify-between gap-5 text-sm"><span>{tenant.name} · {tenant.city ?? "Казахстан"}</span><Link href={demo ? "/admin/ai-studio" : "/register"}>Создать свой каталог на Dukenim →</Link><Link href="/legal/privacy">Конфиденциальность</Link></div></footer></CartProvider></div>;
}
