import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/demo-data";

type PageProps = { searchParams: Promise<{ q?: string; status?: string }> };

export default async function RootOrdersPage({ searchParams }: PageProps) {
  await requireRole(["superadmin"]);
  const params = await searchParams;
  const q = params.q?.trim().toLowerCase().slice(0, 120) ?? "";
  const status = ["new","confirmed","assembled","delivering","done","cancelled"].includes(params.status ?? "") ? params.status : "";
  const client = createAdminClient();
  const [ordersResult, tenantsResult] = await Promise.all([
    client.from("orders").select("id,tenant_id,order_number,status,payment_status,total,created_at,delivery_method").order("created_at", { ascending: false }).limit(500),
    client.from("tenants").select("id,name,slug"),
  ]);
  if (ordersResult.error || tenantsResult.error) throw new Error("Не удалось загрузить заказы.");
  const names = new Map((tenantsResult.data ?? []).map(tenant => [tenant.id, tenant]));
  const orders = (ordersResult.data ?? []).filter(order => {
    const tenant = names.get(order.tenant_id);
    return (!status || order.status===status) && (!q || String(order.order_number ?? "").includes(q) || order.id.includes(q) || tenant?.name.toLowerCase().includes(q) || tenant?.slug.includes(q));
  });
  return <main className="min-h-screen bg-[var(--surface)] px-4 py-10"><div className="mx-auto max-w-6xl">
    <Link href="/root" className="text-sm font-bold text-[var(--accent)]">← Центр управления</Link><h1 className="mt-5 text-3xl font-extrabold">Заказы всех магазинов</h1><p className="muted mt-2">Поиск и проверка заказа без изменения расчётов и статуса оплаты.</p>
    <form className="mt-6 flex flex-wrap gap-2"><input name="q" type="search" defaultValue={q} placeholder="Магазин, номер или ID заказа" className="input max-w-md"/><select name="status" defaultValue={status} className="input max-w-48"><option value="">Все статусы</option>{["new","confirmed","assembled","delivering","done","cancelled"].map(value=><option key={value} value={value}>{value}</option>)}</select><button className="btn btn-primary">Найти</button></form>
    <section className="card mt-6 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b"><th className="p-4">Заказ</th><th>Магазин</th><th>Статус</th><th>Оплата</th><th>Сумма</th><th>Дата</th></tr></thead><tbody>{orders.map(order=><tr key={order.id} className="border-b last:border-0"><td className="p-4"><Link href={`/root/orders/${order.id}`} className="font-bold text-[var(--accent)]">№ {order.order_number ?? order.id.slice(0,8)} →</Link></td><td className="p-4"><Link href={`/root/stores/${order.tenant_id}`} className="font-semibold">{names.get(order.tenant_id)?.name ?? "Магазин удалён"}</Link></td><td className="p-4">{order.status}</td><td className="p-4">{order.payment_status}</td><td className="p-4 font-bold">{money(order.total)}</td><td className="p-4">{new Date(order.created_at).toLocaleString("ru-RU")}</td></tr>)}</tbody></table>{!orders.length&&<p className="muted p-6">Заказов по запросу нет.</p>}</section><p className="muted mt-4 text-sm">Поиск охватывает последние 500 заказов. Возвраты и подтверждение оплаты выполняются только через проверенный платёжный или магазинный процесс.</p>
  </div></main>;
}
