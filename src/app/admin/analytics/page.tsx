import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadSalesPeriod, salesPeriod } from "@/lib/order-analytics";
import { money } from "@/lib/demo-data";
import { loadGrossProfit } from "@/lib/order-profit";
import { customSalesPeriod } from "@/lib/custom-sales-period";

export default async function Analytics({ searchParams }: { searchParams: Promise<{ days?: string; from?: string; to?: string }> }) {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const query = await searchParams;
  const days = query.days === "1" ? 1 : query.days === "30" ? 30 : 7;
  let period = salesPeriod(days), rangeError = "";
  const custom = Boolean(query.from || query.to);
  if(custom) { try { period=customSalesPeriod(query.from??"",query.to??""); } catch(error) { rangeError=error instanceof Error?error.message:"Проверьте даты."; } }
  let report: Awaited<ReturnType<typeof loadSalesPeriod>> | null = null;
  try { if(!rangeError) report = await loadSalesPeriod(await createClient(), tenantId!, period); } catch { /* No invented zero totals. */ }
  const max = Math.max(...(report?.days.map(day => day.total) ?? []), 1);
  let profit:number|null=null,profitFailed=false;
  try{if(!rangeError)profit=await loadGrossProfit(await createClient(),tenantId!,period);}catch{profitFailed=true;}
  return <>
    <h1 className="text-3xl font-semibold">Аналитика</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">Оплаченные заказы, созданные за выбранный период. Отменённые заказы и возвраты исключены. Суммы включают доставку. Часовой пояс: Казахстан, UTC+5.</p>
    <nav aria-label="Период отчёта" className="mt-5 flex flex-wrap gap-2">{([1,7,30] as const).map(value => <Link key={value} href={`/admin/analytics?days=${value}`} aria-current={!custom&&days === value ? "page" : undefined} className="rounded-full border px-4 py-2 text-sm">{value === 1 ? "Сегодня" : `${value} дней`}</Link>)}</nav>
    <details open={custom} className="card mt-4 p-4"><summary className="cursor-pointer font-semibold">Выбрать период</summary><form className="mt-4 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm">С<input type="date" name="from" required defaultValue={query.from} className="input"/></label><label className="grid gap-1 text-sm">По<input type="date" name="to" required defaultValue={query.to} className="input"/></label><button className="btn btn-primary">Показать</button></form>{rangeError&&<p role="alert" className="mt-3 text-red-700">{rangeError}</p>}</details>
    {!report ? <p role="alert" className="card mt-6 p-6">Не удалось рассчитать отчёт целиком. Обновите страницу или напишите в поддержку. Отсутствие данных не означает нулевые продажи.</p> : <>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">{[["Оплачено по заказам",report.total],["Онлайн",report.online],["В магазине",report.offline]].map(([label,value]) => <div key={label} className="card p-5"><small className="text-neutral-500">{label}</small><b className="mt-3 block text-2xl">{money(Number(value))}</b></div>)}</div>
      <section className="card mt-6 p-6"><h2 className="text-xl font-semibold">По дням · {report.count} оплаченных заказов</h2><div className="mt-6 space-y-3">{report.days.map(day => <div key={day.day} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 text-sm"><span>{day.day.slice(8)}.{day.day.slice(5,7)}</span><div className="h-3 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true"><div className="h-full rounded-full bg-neutral-800" style={{width:`${day.total / max * 100}%`}}/></div><span>{money(day.total)}</span></div>)}</div></section>
    </>}
    {profit!==null?<section className="card mt-6 p-6"><h2 className="text-lg font-semibold">Валовая прибыль по товарам</h2><b className="mt-3 block text-2xl">{money(profit)}</b><p className="mt-3 text-sm text-neutral-500">Цена товаров минус себестоимость, зафиксированная при создании заказа. Без доставки, налогов, комиссий и других расходов — это не чистая прибыль.</p></section>:<p className="mt-5 text-sm leading-6 text-neutral-500">{profitFailed?"Не удалось полностью проверить себестоимость заказов. Прибыль не показана.":"Для прибыли нужна себестоимость всех позиций на момент создания заказа. Укажите её на складе — будущие заказы сохранят эти значения. Прошлые неизвестные затраты не подменяются текущими."} <Link href="/admin/stock" className="underline">Открыть склад →</Link></p>}
  </>;
}
