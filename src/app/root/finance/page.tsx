import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/demo-data";

export default async function RootFinancePage() {
  await requireRole(["superadmin"]);
  const client = createAdminClient();
  const [tenantsResult, subscriptionsResult, checkoutsResult, crmResult] = await Promise.all([
    client.from("tenants").select("id,name,plan,status"),
    client.from("subscriptions").select("tenant_id,plan,status,current_period_end,polar_subscription_id").order("started_at",{ascending:false}).limit(200),
    client.from("subscription_checkout_requests").select("tenant_id,plan,final_amount,status,created_at").order("created_at",{ascending:false}).limit(200),
    client.from("crm_setup_charges").select("tenant_id,amount_kzt,status,polar_order_id,created_at").order("created_at",{ascending:false}).limit(200),
  ]);
  if(tenantsResult.error||subscriptionsResult.error||checkoutsResult.error||crmResult.error)throw new Error("Не удалось загрузить финансовые статусы.");
  const names=new Map((tenantsResult.data??[]).map(tenant=>[tenant.id,tenant.name]));
  return <main className="min-h-screen bg-[var(--surface)] px-4 py-10"><div className="mx-auto max-w-6xl"><Link href="/root" className="text-sm font-bold text-[var(--accent)]">← Центр управления</Link><h1 className="mt-5 text-3xl font-extrabold">Платежи и тарифы</h1><p className="muted mt-2">Здесь показаны записи Dukenim. Фактическое зачисление и возвраты сверяются с платёжным провайдером.</p>
  <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="card p-5"><b className="text-2xl">{subscriptionsResult.data?.filter(x=>x.status==="active").length??0}</b><p className="muted mt-2">Активных подписок в базе</p></div><div className="card p-5"><b className="text-2xl">{checkoutsResult.data?.filter(x=>x.status==="awaiting_payment").length??0}</b><p className="muted mt-2">Ожидают оплату тарифа</p></div><div className="card p-5"><b className="text-2xl">{crmResult.data?.filter(x=>x.status==="awaiting_payment").length??0}</b><p className="muted mt-2">Ожидают оплату CRM</p></div></div>
  <section className="card mt-6 overflow-x-auto"><h2 className="p-5 text-xl font-bold">Подписки</h2><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b"><th className="p-4">Магазин</th><th>Тариф</th><th>Статус</th><th>Период до</th><th>Polar</th></tr></thead><tbody>{(subscriptionsResult.data??[]).map((row,index)=><tr key={`${row.tenant_id}-${index}`} className="border-b last:border-0"><td className="p-4">{names.get(row.tenant_id)??"Магазин удалён"}</td><td>{row.plan}</td><td>{row.status}</td><td>{row.current_period_end?new Date(row.current_period_end).toLocaleDateString("ru-RU"):"—"}</td><td>{row.polar_subscription_id?"Связана":"Нет ID"}</td></tr>)}</tbody></table>{!subscriptionsResult.data?.length&&<p className="muted p-5">Подписок нет.</p>}</section>
  <div className="mt-6 grid gap-5 lg:grid-cols-2"><section className="card overflow-hidden"><h2 className="p-5 text-xl font-bold">Заявки на тариф</h2><div className="divide-y">{(checkoutsResult.data??[]).map((row,index)=><div key={index} className="flex justify-between gap-3 p-4 text-sm"><span>{names.get(row.tenant_id)??"Магазин удалён"} · {row.plan}<small className="muted block">{row.status}</small></span><b>{money(row.final_amount)}</b></div>)}</div>{!checkoutsResult.data?.length&&<p className="muted p-5">Заявок нет.</p>}</section><section className="card overflow-hidden"><h2 className="p-5 text-xl font-bold">Подключение CRM</h2><div className="divide-y">{(crmResult.data??[]).map((row,index)=><div key={index} className="flex justify-between gap-3 p-4 text-sm"><span>{names.get(row.tenant_id)??"Магазин удалён"}<small className="muted block">{row.status} · {row.polar_order_id?"Есть Polar ID":"Нет Polar ID"}</small></span><b>{money(row.amount_kzt)}</b></div>)}</div>{!crmResult.data?.length&&<p className="muted p-5">Начислений нет.</p>}</section></div>
  <p className="muted mt-4 text-sm">Списки ограничены 200 последними записями каждого типа. Эта страница не выполняет списаний и не меняет финансовые статусы.</p>
  </div></main>;
}
