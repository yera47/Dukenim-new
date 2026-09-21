import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/demo-data";
import { cancelRootUnpaidOrder } from "../../actions";

export default async function RootOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["superadmin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const client = createAdminClient();
  const orderResult = await client.from("orders").select("*").eq("id", id).maybeSingle();
  if (orderResult.error || !orderResult.data) notFound();
  const order = orderResult.data;
  const [tenantResult, customerResult, itemsResult, movementsResult] = await Promise.all([
    client.from("tenants").select("name,slug").eq("id",order.tenant_id).maybeSingle(),
    order.customer_id ? client.from("customers").select("name,phone").eq("id",order.customer_id).eq("tenant_id",order.tenant_id).maybeSingle() : Promise.resolve({data:null,error:null}),
    client.from("order_items").select("title_snapshot,price_snapshot,qty,options_snapshot").eq("order_id",id).eq("tenant_id",order.tenant_id),
    client.from("stock_movements").select("delta,reason,created_at").eq("order_id",id).eq("tenant_id",order.tenant_id),
  ]);
  if (tenantResult.error || customerResult.error || itemsResult.error || movementsResult.error) throw new Error("Не удалось загрузить детали заказа.");
  return <main className="min-h-screen bg-[var(--surface)] px-4 py-10"><div className="mx-auto max-w-4xl"><Link href="/root/orders" className="text-sm font-bold text-[var(--accent)]">← Все заказы</Link><h1 className="mt-5 text-3xl font-extrabold">Заказ № {order.order_number ?? order.id.slice(0,8)}</h1><p className="muted mt-2">{tenantResult.data?.name ?? "Магазин"} · {new Date(order.created_at).toLocaleString("ru-RU")}</p>
    <div className="mt-6 grid gap-5 md:grid-cols-2"><section className="card p-5"><h2 className="text-lg font-bold">Получение</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><dt>Статус</dt><dd className="font-bold">{order.status}</dd><dt>Способ</dt><dd>{order.delivery_method ?? "—"}</dd><dt>Адрес</dt><dd>{order.delivery_address ?? "—"}</dd><dt>Покупатель</dt><dd>{customerResult.data?.name ?? "—"}</dd><dt>Телефон</dt><dd>{customerResult.data?.phone ?? "—"}</dd></dl></section><section className="card p-5"><h2 className="text-lg font-bold">Расчёт</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><dt>Товары</dt><dd>{money(order.subtotal)}</dd><dt>Доставка</dt><dd>{money(order.delivery_cost)}</dd><dt>Итого</dt><dd className="font-bold">{money(order.total)}</dd><dt>Метод оплаты</dt><dd>{order.payment_method ?? "—"}</dd><dt>Статус оплаты</dt><dd className="font-bold">{order.payment_status}</dd></dl></section></div>
    <section className="card mt-5 p-5"><h2 className="text-lg font-bold">Состав</h2><ul className="mt-3 divide-y">{(itemsResult.data ?? []).map((item,index)=><li key={index} className="flex justify-between gap-4 py-3 text-sm"><span>{item.title_snapshot} × {item.qty}</span><b>{money(item.price_snapshot*item.qty)}</b></li>)}</ul></section>
    <section className="card mt-5 p-5"><h2 className="text-lg font-bold">Движения остатков</h2>{movementsResult.data?.length?<ul className="mt-3 space-y-2 text-sm">{movementsResult.data.map((item,index)=><li key={index}>{item.reason}: {item.delta} · {new Date(item.created_at).toLocaleString("ru-RU")}</li>)}</ul>:<p className="muted mt-3 text-sm">Нет связанных движений.</p>}</section>
    {order.order_number&&["new","confirmed","assembled","delivering"].includes(order.status)&&order.payment_status==="pending"&&<details className="card mt-5 p-5"><summary className="cursor-pointer font-bold text-red-700">Отменить неоплаченный заказ</summary><p className="muted mt-3 text-sm">Доступно только для незавершённого неоплаченного заказа. Склад и лояльность пересчитаются штатными правилами, а причина сохранится в аудите. Оплаченный заказ сначала требует подтверждённого возврата денег.</p><form action={cancelRootUnpaidOrder} className="mt-4 grid gap-3 sm:max-w-lg"><input type="hidden" name="orderId" value={order.id}/><input type="hidden" name="expectedStatus" value={order.status}/><label className="text-sm font-semibold">Введите номер заказа {order.order_number}<input name="confirmNumber" type="number" min={1} step={1} required className="input mt-1" autoComplete="off"/></label><label className="text-sm font-semibold">Причина отмены<input name="reason" required minLength={3} maxLength={1000} className="input mt-1"/></label><button className="btn bg-red-800 text-white">Отменить заказ с аудитом</button></form></details>}
    <Link href={`/root/stores/${order.tenant_id}`} className="btn btn-secondary mt-6">Открыть магазин →</Link>
  </div></main>;
}
