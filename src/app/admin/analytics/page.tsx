import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadSalesPeriod, salesPeriod } from "@/lib/order-analytics";
import { money } from "@/lib/demo-data";
import { loadGrossProfit } from "@/lib/order-profit";

export default async function Analytics({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const query = await searchParams;
  const days = query.days === "1" ? 1 : query.days === "30" ? 30 : 7;
  let report: Awaited<ReturnType<typeof loadSalesPeriod>> | null = null;
  try { report = await loadSalesPeriod(await createClient(), tenantId!, salesPeriod(days)); } catch { /* No invented zero totals. */ }
  const max = Math.max(...(report?.days.map(day => day.total) ?? []), 1);
  let profit:number|null=null,profitFailed=false;
  try{profit=await loadGrossProfit(await createClient(),tenantId!,salesPeriod(days));}catch{profitFailed=true;}
  return <>
    <h1 className="text-3xl font-semibold">Аналитика</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">Оплаченные заказы, созданные за выбранный период. Отменённые заказы и возвраты исключены. Суммы включают доставку. Часовой пояс: Казахстан, UTC+5.</p>
    <nav aria-label="Период отчёта" className="mt-5 flex gap-2">{([1,7,30] as const).map(value => <Link key={value} href={`/admin/analytics?days=${value}`} aria-current={days === value ? "page" : undefined} className={`rounded-full border px-4 py-2 text-sm ${days === value ? "bg-neutral-900 text-white" : "bg-white"}`}>{value === 1 ? "Сегодня" : `${value} дней`}</Link>)}</nav>
    {!report ? <p role="alert" className="card mt-6 p-6">Не удалось рассчитать отчёт целиком. Обновите страницу или напишите в поддержку. Отсутствие данных не означает нулевые продажи.</p> : <>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">{[["Оплачено по заказам",report.total],["Онлайн",report.online],["В магазине",report.offline]].map(([label,value]) => <div key={label} className="card p-5"><small className="text-neutral-500">{label}</small><b className="mt-3 block text-2xl">{money(Number(value))}</b></div>)}</div>
      <section className="card mt-6 p-6"><h2 className="text-xl font-semibold">По дням · {report.count} оплаченных заказов</h2><div className="mt-6 space-y-3">{report.days.map(day => <div key={day.day} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 text-sm"><span>{day.day.slice(8)}.{day.day.slice(5,7)}</span><div className="h-3 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true"><div className="h-full rounded-full bg-neutral-800" style={{width:`${day.total / max * 100}%`}}/></div><span>{money(day.total)}</span></div>)}</div></section>
    </>}
    {profit!==null?<section className="card mt-6 p-6"><h2 className="text-lg font-semibold">Валовая прибыль по товарам</h2><b className="mt-3 block text-2xl">{money(profit)}</b><p className="mt-3 text-sm text-neutral-500">Цена товаров минус себестоимость, зафиксированная при создании заказа. Без доставки, налогов, комиссий и других расходов — это не чистая прибыль.</p></section>:<p className="mt-5 text-sm leading-6 text-neutral-500">{profitFailed?"Не удалось полностью проверить себестоимость заказов. Прибыль не показана.":"Для прибыли нужна себестоимость всех позиций на момент создания заказа. Укажите её на складе — будущие заказы сохранят эти значения. Прошлые неизвестные затраты не подменяются текущими."} <Link href="/admin/stock" className="underline">Открыть склад →</Link></p>}
  </>;
}
