import Link from "next/link";
import { PackagePlus, Search } from "lucide-react";
import { money } from "@/lib/demo-data";
import { requireRole } from "@/lib/auth";
import { loadOwnerCatalog } from "@/lib/owner-data";
import { toggleProduct } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/queries/owner";

export default async function Catalog() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const client = process.env.NEXT_PUBLIC_SUPABASE_URL ? await createClient() : null;
  const [catalog, tenantResult] = await Promise.all([loadOwnerCatalog(tenantId!), client ? getTenant(client, tenantId!) : Promise.resolve({ data: null })]);
  const { products, variants } = catalog;
  const isNotStarted = tenantResult.data?.catalog_status === "not_started";
  return <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="muted text-sm">Управление общей витриной</p><h1 className="mt-1 text-3xl font-semibold">Каталог</h1></div><Link href={isNotStarted ? "/admin/catalog/create" : "/admin/catalog/new"} className="btn btn-primary">{isNotStarted ? "Создать каталог" : "+ Добавить товар"}</Link></div>
    {isNotStarted ? <section className="catalog-empty card mt-7"><PackagePlus size={34} /><h2>Сначала создайте каталог</h2><p>Это отдельный шаг запуска. Он сохранит название витрины и откроет добавление товаров.</p><Link href="/admin/catalog/create" className="btn btn-cta">Создать каталог</Link></section> : !products.length ? <section className="catalog-empty card mt-7"><PackagePlus size={34} /><h2>Каталог создан, но пока пуст</h2><p>Добавьте первый товар с фотографией, ценой и остатком. После этого можно будет настраивать витрину и принимать заказы.</p><Link href="/admin/catalog/new" className="btn btn-cta">Добавить первый товар</Link></section> : <div className="card mt-7 overflow-hidden"><div className="flex gap-3 border-b p-4"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="input pl-10" placeholder="Поиск по товарам" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Товар</th><th>Цена</th><th>Остаток</th><th>На витрине</th><th /></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t"><td className="p-4"><div className="flex items-center gap-3"><span style={product.images[0] ? { backgroundImage: `url(${product.images[0]})`, backgroundSize: "cover" } : undefined} className="product-image size-14 rounded-xl" /><div><b>{product.title}</b><small className="muted block">{product.description?.slice(0, 55)}</small></div></div></td><td className="font-bold">{money(product.price)}</td><td>{variants.filter((variant) => variant.product_id === product.id).reduce((sum, variant) => sum + variant.stock_qty, 0)} шт.</td><td><form action={toggleProduct}><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="active" value={String(product.is_active)} /><button aria-label="На витрине" className={`h-7 w-12 rounded-full p-1 transition ${product.is_active ? "bg-[var(--accent)]" : "bg-slate-300"}`}><span className={`block size-5 rounded-full bg-white transition ${product.is_active ? "translate-x-5" : ""}`} /></button></form></td><td><Link href={`/admin/catalog/${product.id}/edit`} className="text-sm font-bold text-[var(--accent)]">Изменить</Link></td></tr>)}</tbody></table></div></div>}</>;
}
