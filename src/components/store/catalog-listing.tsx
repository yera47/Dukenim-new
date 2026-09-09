import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveTenant } from "@/lib/tenant";
import { loadProducts } from "@/lib/storefront-data";
import { CatalogBrowser } from "@/components/store/catalog-browser";

export async function CatalogListing({ slug, category }: { slug: string; category?: string }) {
  const tenant = await resolveTenant(slug); if (!tenant) notFound();
  const all = await loadProducts(tenant.id);
  if (category && !all.some(product => product.category === category)) notFound();
  const products = category ? all.filter(product => product.category === category) : all;
  return <main className="container min-h-[60vh] py-10"><Link href={`/s/${slug}`} className="text-sm opacity-60">Главная / {category ?? "Каталог"}</Link><div className="flex items-end justify-between gap-4 py-10"><h1 className="text-4xl font-semibold tracking-tight md:text-6xl">{category ?? "Все товары"}</h1><span className="text-sm opacity-60">Позиций: {products.length}</span></div>{products.length ? <CatalogBrowser key={category ?? "all"} products={products} slug={slug}/> : <p className="py-12 opacity-60">Товары скоро появятся.</p>}</main>;
}
