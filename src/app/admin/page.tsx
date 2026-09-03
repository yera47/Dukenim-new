import Link from "next/link";
import { AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, Check, LockKeyhole, ShoppingBag, Store, Wallet } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { money } from "@/lib/demo-data";
import { requireRole } from "@/lib/auth";
import { loadOwnerCatalog, loadOwnerOrders } from "@/lib/owner-data";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/queries/owner";

function CatalogStart({ name }: { name?: string | null }) {
  return <section className="admin-catalog-start">
    <div className="admin-catalog-start-copy">
      <h1>Создайте первый каталог.</h1>
      <p>Каталог — это отдельная витрина магазина. После его создания добавьте товары, а затем оформите и опубликуйте магазин.</p>
      <div className="mt-7 flex flex-wrap gap-3"><Link href="/admin/catalog/create" className="btn btn-cta">Создать каталог <ArrowRight size={18} /></Link></div>
    </div>
    <div className="admin-catalog-start-route" aria-label="Маршрут запуска магазина">
      <div><Check size={20} /><b>Аккаунт готов</b><p>Тариф выбран, пробный период активен.</p></div>
      <div className="is-current"><ShoppingBag size={20} /><b>{name ? `Каталог «${name}»` : "Каталог"}</b><p>Задайте название будущей витрины.</p></div>
      <div className="is-locked"><Store size={20} /><b>Первый товар</b><p>Добавьте фото, цену и остаток.</p><LockKeyhole size={15} /></div>
      <div className="is-locked"><BarChart3 size={20} /><b>Заказы и аналитика</b><p>Появятся, когда витрина начнёт работать.</p><LockKeyhole size={15} /></div>
    </div>
  </section>;
}

function CatalogBuilding({ name }: { name?: string | null }) {
  return <section className="admin-catalog-start">
    <div className="admin-catalog-start-copy"><h1>Каталог создан. Добавьте первый товар.</h1><p>{name ? `Витрина «${name}»` : "Витрина"} уже подготовлена. Загрузите фото, укажите цену и остаток — после сохранения каталог станет готов к оформлению и приёму заказов.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/admin/catalog/new" className="btn btn-cta">Добавить первый товар <ArrowRight size={18} /></Link><Link href="/admin/catalog" className="btn btn-secondary">Открыть каталог</Link></div></div>
    <div className="admin-catalog-start-route" aria-label="Маршрут запуска магазина"><div><Check size={20} /><b>Аккаунт готов</b><p>Тариф выбран, пробный период активен.</p></div><div><Check size={20} /><b>Каталог создан</b><p>{name ? `Витрина «${name}» сохранена.` : "Витрина сохранена."}</p></div><div className="is-current"><ShoppingBag size={20} /><b>Первый товар</b><p>Добавьте фото, цену и остаток.</p></div><div className="is-locked"><BarChart3 size={20} /><b>Заказы и аналитика</b><p>Появятся, когда витрина начнёт работать.</p><LockKeyhole size={15} /></div></div>
  </section>;
}

export default async function Admin() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const client = process.env.NEXT_PUBLIC_SUPABASE_URL ? await createClient() : null;
  const [catalog, orders, tenantResult] = await Promise.all([loadOwnerCatalog(tenantId!), loadOwnerOrders(tenantId!), client ? getTenant(client, tenantId!) : Promise.resolve({ data: null })]);
  const tenant = tenantResult.data;
  if (tenant?.catalog_status === "not_started") return <CatalogStart name={tenant.name} />;
  if (!catalog.products.length) return <CatalogBuilding name={tenant?.catalog_name ?? tenant?.name} />;
  const today = new Date().toDateString();
  const todayOrders = orders.filter((order) => new Date(order.created_at).toDateString() === today);
  const revenue = todayOrders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.total, 0);
  const low = catalog.variants.filter((variant) => variant.stock_qty > 0 && variant.stock_qty <= 3);
  const average = orders.length ? Math.round(orders.reduce((sum, order) => sum + order.total, 0) / orders.length) : 0;
  return <>
    <div className="flex flex-wrap items-end justify-between gap-5"><div><div className="data-label">СЕГОДНЯ · РАБОЧАЯ ПАНЕЛЬ</div><h1 className="mt-2 text-4xl font-extrabold">Добрый день</h1><p className="mt-2 text-[var(--ink-60)]">Вот что происходит в магазине прямо сейчас.</p></div><Link href="/admin/catalog/new" className="btn btn-cta">Добавить товар <ArrowUpRight size={18} /></Link></div>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="ВЫРУЧКА СЕГОДНЯ" value={money(revenue)} note={`${todayOrders.length} заказов`} icon={Wallet} /><StatCard label="ВСЕ ЗАКАЗЫ" value={String(orders.length)} note="Онлайн и в магазине" icon={ShoppingBag} /><StatCard label="СРЕДНИЙ ЧЕК" value={money(average)} note="За весь период" icon={ArrowUpRight} /><StatCard label="МАЛО НА СКЛАДЕ" value={`${low.length}`} note="Остаток от 1 до 3 шт." icon={AlertTriangle} /></section>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.6fr]"><section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--line)] p-6"><div><h2 className="text-xl font-extrabold">Последние заказы</h2><p className="mt-1 text-sm text-[var(--ink-60)]">Новые события торгового потока</p></div><Link href="/admin/orders" className="text-sm font-extrabold text-[var(--accent)]">Все заказы →</Link></div><div className="overflow-x-auto px-6"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-[var(--ink-60)]"><tr><th className="py-4">Заказ</th><th>Канал</th><th>Сумма</th><th>Статус</th><th>Дата</th></tr></thead><tbody>{orders.slice(0, 6).map((order) => <tr key={order.id} className="border-t border-[var(--line)]"><td className="tabular py-4 font-extrabold">#{order.order_number}</td><td>{order.source === "online" ? "Онлайн" : "В магазине"}</td><td className="tabular font-bold">{money(order.total)}</td><td><span className="badge">{order.status}</span></td><td className="text-[var(--ink-60)]">{new Date(order.created_at).toLocaleDateString("ru-KZ")}</td></tr>)}</tbody></table></div></section><section className="panel-dark rounded-[var(--r-card)] p-6"><div className="data-label text-white/40">ТРЕБУЕТ ВНИМАНИЯ</div><h2 className="mt-2 text-xl font-extrabold">Мало на складе</h2><div className="mt-5">{low.length ? low.slice(0, 6).map((variant) => <div key={variant.id} className="flex justify-between gap-3 border-t border-white/12 py-4"><b className="text-sm">{catalog.products.find((product) => product.id === variant.product_id)?.title}</b><span className="tabular text-sm font-bold text-[var(--accent-bright)]">{variant.size ?? "Вариант"}: {variant.stock_qty}</span></div>) : <p className="border-t border-white/12 py-6 text-sm text-white/55">Все товары в достаточном количестве.</p>}</div></section></div>
  </>;
}
