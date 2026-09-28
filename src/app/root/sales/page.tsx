import Link from "next/link";
import { ArrowLeft, BellRing, CalendarDays, CheckCircle2, Download, ExternalLink, Instagram, MapPinned, Navigation, Phone, Plus, Route, Search, Store, Target, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireFieldSalesAccess } from "@/lib/field-sales-access.server";
import { buildVisitRoute, FIELD_SALES_STATUSES, routeLengthKm, safeExternalUrl, statusLabel, type FieldSalesLead } from "@/lib/field-sales";
import type { Database } from "@/types/database";
import { createFieldSalesLead, saveFieldSalesRoute, updateFieldSalesLead } from "./actions";

export const dynamic = "force-dynamic";

type Zone = Database["public"]["Tables"]["field_sales_zones"]["Row"];
type FieldSalesParams = { zone?: string; segment?: string; status?: string; q?: string; stops?: string; lead?: string; view?: "admin" };

const fallbackZones: Zone[] = [
  { id: "Z1", name: "Байтерек", road_boundaries: "Сарайшык / Достык → Сыганак", west: 71.4164, east: 71.449, south: 51.122, north: 51.132, sort_order: 1, active: true, created_at: "" },
  { id: "Z2", name: "Акмешит — Алматы", road_boundaries: "Сыганак → Керей–Жәнібек хандар", west: 71.4164, east: 71.449, south: 51.112, north: 51.122, sort_order: 2, active: true, created_at: "" },
  { id: "Z3", name: "Ботанический сад", road_boundaries: "Керей–Жәнібек хандар → Бухар жырау", west: 71.4164, east: 71.449, south: 51.1025, north: 51.112, sort_order: 3, active: true, created_at: "" },
];

const statusClass: Record<string, string> = { new: "is-slate", planned: "is-blue", contacted: "is-violet", negotiating: "is-amber", demo: "is-orange", follow_up: "is-pink", won: "is-green", lost: "is-red", do_not_contact: "is-gray" };
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty" }).format(new Date());
const dateTimeLocal = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";

function FieldMap({ zone, route }: { zone: Zone; route: FieldSalesLead[] }) {
  const point = (lead: FieldSalesLead) => ({
    x: 7 + ((Number(lead.longitude) - Number(zone.west)) / (Number(zone.east) - Number(zone.west))) * 86,
    y: 8 + ((Number(zone.north) - Number(lead.latitude)) / (Number(zone.north) - Number(zone.south))) * 80,
  });
  const points = route.map(point);
  return <div className="sales-map" aria-label={`Схема ${zone.name}`}>
    <svg viewBox="0 0 100 100" role="img">
      <defs><pattern id={`minor-${zone.id}`} width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#dbe7df" strokeWidth=".45"/></pattern></defs>
      <rect width="100" height="100" fill="#f5f1e7"/><rect width="100" height="100" fill={`url(#minor-${zone.id})`}/>
      {[18,36,54,72,88].map((x)=><path key={`v${x}`} d={`M${x} 0V100`} stroke="#bdd8bf" strokeWidth="1.4"/>)}
      {[18,38,58,78].map((y)=><path key={`h${y}`} d={`M0 ${y}H100`} stroke="#d9c57e" strokeWidth="1.8"/>)}
      <rect x="6" y="7" width="88" height="82" rx="2" fill="none" stroke="#17251f" strokeWidth="1.8"/>
      {points.length > 1 && <polyline points={points.map((item) => `${item.x},${item.y}`).join(" ")} fill="none" stroke="#b45838" strokeWidth="1.4" strokeLinejoin="round" strokeDasharray="2 1"/>}
      {route.map((lead,index)=>{const p=point(lead);return <g key={lead.id}><circle cx={p.x} cy={p.y} r="3.3" fill="#071b17" stroke="#f4f0e8" strokeWidth="1"/><text x={p.x} y={p.y+.9} textAnchor="middle" fontSize="2.8" fontWeight="900" fill="#fff">{index+1}</text></g>})}
      <text x="50" y="4.3" textAnchor="middle" fontSize="3" fontWeight="800" fill="#53635a">{zone.id === "Z1" ? "САРАЙШЫК / ДОСТЫК" : zone.id === "Z2" ? "СЫГАНАК" : "КЕРЕЙ–ЖӘНІБЕК ХАНДАР"}</text>
      <text x="50" y="96.5" textAnchor="middle" fontSize="3" fontWeight="800" fill="#53635a">{zone.id === "Z1" ? "СЫГАНАК" : zone.id === "Z2" ? "КЕРЕЙ–ЖӘНІБЕК ХАНДАР" : "БУХАР ЖЫРАУ"}</text>
      <text x="3" y="50" textAnchor="middle" fontSize="2.6" fill="#68766f" transform="rotate(-90 3 50)">ЗАПАДНАЯ ГРАНИЦА</text>
      <text x="97" y="50" textAnchor="middle" fontSize="2.6" fill="#68766f" transform="rotate(90 97 50)">ТУРКЕСТАН / ДОСТЫК</text>
    </svg>
    <div className="sales-map-caption"><span><MapPinned size={16}/>{zone.id} · {zone.name}</span><small>{zone.road_boundaries}</small></div>
  </div>;
}

export default async function FieldSalesPage({ searchParams }: { searchParams: Promise<FieldSalesParams> }) {
  await requireFieldSalesAccess();
  const params = await searchParams;
  const basePath = params.view === "admin" ? "/admin/sales" : "/root/sales";
  const backHref = params.view === "admin" ? "/admin" : "/root";
  const backLabel = params.view === "admin" ? "Панель магазина" : "Центр платформы";
  const client = createAdminClient();
  const zonesResult = await client.from("field_sales_zones").select("*").eq("active", true).order("sort_order");
  const zones = zonesResult.data?.length ? zonesResult.data : fallbackZones;
  const selectedZone = zones.find((zone) => zone.id === params.zone) ?? zones[0];
  let query = client.from("field_sales_leads").select("*").eq("zone_id", selectedZone.id).order("priority_score", { ascending: false }).limit(1000);
  if (params.segment) query = query.eq("segment", params.segment);
  if (params.status) query = query.eq("status", params.status as FieldSalesLead["status"]);
  if (params.q?.trim()) query = query.or(`name.ilike.%${params.q.trim().replace(/[,%()]/g, "")}%,address.ilike.%${params.q.trim().replace(/[,%()]/g, "")}%`);
  const leadsResult = await query;
  const leads = leadsResult.data ?? [];
  const [zoneCounts, dueResult] = await Promise.all([
    Promise.all(zones.map(async (zone) => ({ id: zone.id, count: (await client.from("field_sales_leads").select("id", { count: "exact", head: true }).eq("zone_id", zone.id)).count ?? 0 }))),
    client.from("field_sales_leads").select("id", { count: "exact", head: true }).not("reminder_at", "is", null).lte("reminder_at", new Date().toISOString()).not("status", "in", "(won,lost,do_not_contact)"),
  ]);
  const allZoneLeads = leadsResult.error ? [] : leads;
  const segments = Array.from(new Set(allZoneLeads.map((lead) => lead.segment))).sort((a,b)=>a.localeCompare(b,"ru"));
  const stopLimit = [8, 12, 20, 30].includes(Number(params.stops)) ? Number(params.stops) : 12;
  const route = buildVisitRoute(allZoneLeads, stopLimit);
  const openedLead = allZoneLeads.find((lead) => lead.id === params.lead);
  const activeRoute = allZoneLeads.filter((lead) => lead.route_day === today()).sort((a,b)=>(a.route_position??999)-(b.route_position??999));
  const routeShown = activeRoute.length ? activeRoute : route;
  const connected = allZoneLeads.filter((lead) => lead.status === "won").length;
  const negotiations = allZoneLeads.filter((lead) => ["contacted","negotiating","demo","follow_up"].includes(lead.status)).length;

  return <main className="field-sales-shell">
    <header className="field-sales-header"><div className="container"><div><Link href={backHref} className="field-sales-back"><ArrowLeft size={16}/> {backLabel}</Link><p>DUKENIM · ВЫЕЗДНЫЕ ПРОДАЖИ</p><h1>Карта продаж по Астане</h1><span>Зоны идут по дорогам. Внутри каждой — все подходящие сегменты и один маршрут без лишних кругов.</span></div><div className="field-sales-header-actions"><a href={`${basePath}/export`} className="sales-secondary"><Download size={17}/> Выгрузить в Excel</a><a href="#new-lead" className="sales-primary"><Plus size={17}/> Добавить точку</a></div></div></header>

    <div className="container field-sales-body">
      {leadsResult.error && <section className="sales-warning"><b>База ещё не применена.</b><span>Интерфейс готов, но миграция field-sales CRM отсутствует в текущей базе. После применения миграции появятся 1 394 заведения.</span></section>}

      <section className="sales-zone-strip" aria-label="Зоны продаж">{zones.map((zone)=>{const count=zoneCounts.find((item)=>item.id===zone.id)?.count??0;return <Link key={zone.id} href={`${basePath}?zone=${zone.id}`} className={zone.id===selectedZone.id?"is-active":""}><span>{zone.id}</span><div><b>{zone.name}</b><small>{count.toLocaleString("ru-RU")} заведений · все сегменты</small></div></Link>})}</section>

      <section className="sales-kpis"><article><Store/><span><small>В выбранной зоне</small><b>{allZoneLeads.length.toLocaleString("ru-RU")}</b></span></article><article><Users/><span><small>В переговорах</small><b>{negotiations}</b></span></article><article><CheckCircle2/><span><small>Подключено</small><b>{connected}</b></span></article><article className={(dueResult.count??0)>0?"is-alert":""}><BellRing/><span><small>Напоминания просрочены</small><b>{dueResult.count??0}</b></span></article></section>

      <section className="sales-workspace">
        <div className="sales-route-panel">
          <div className="sales-section-head"><div><p>МАРШРУТ НА СЕГОДНЯ</p><h2>{activeRoute.length ? "Сохранённый маршрут" : "Предложенный порядок"}</h2></div><span className="sales-distance"><Route size={16}/>{routeLengthKm(routeShown).toFixed(1)} км между точками</span></div>
          <FieldMap zone={selectedZone} route={routeShown}/>
          <div className="sales-route-tools"><form className="sales-stops" action={basePath}><input type="hidden" name="zone" value={selectedZone.id}/><label>Точек<select name="stops" defaultValue={stopLimit}>{[8,12,20,30].map((value)=><option key={value} value={value}>{value}</option>)}</select></label><button>Пересчитать</button></form>{route.length>0&&<form action={saveFieldSalesRoute}><input type="hidden" name="zone" value={selectedZone.id}/><input type="hidden" name="day" value={today()}/><input type="hidden" name="leadIds" value={JSON.stringify(route.map((lead)=>lead.id))}/><button className="sales-primary"><CalendarDays size={16}/> Сохранить на сегодня</button></form>}</div>
          <ol className="sales-route-list">{routeShown.map((lead,index)=><li key={lead.id}><span>{index+1}</span><div><b>{lead.name}</b><small>{lead.segment} · {lead.address}</small></div>{safeExternalUrl(lead.map_url)&&<a href={safeExternalUrl(lead.map_url)!} target="_blank" rel="noreferrer" aria-label="Открыть в 2ГИС"><Navigation size={17}/></a>}</li>)}</ol>
        </div>

        <aside className="sales-day-panel"><p>КАК РАБОТАТЬ</p><h2>Зона целиком, маршрут — на день</h2><div className="sales-steps"><span><b>1</b><em>Выберите зону</em><small>Все сегменты уже собраны вместе.</small></span><span><b>2</b><em>Сохраните 8–20 точек</em><small>Сначала высокий приоритет, затем ближайшая точка по пути.</small></span><span><b>3</b><em>После визита обновите этап</em><small>Запишите контакт, итог и следующее напоминание.</small></span></div><div className="sales-tip"><Target size={20}/><span><b>Почему этот маршрут</b><small>Сначала лучшие лиды, затем алгоритм сокращает расстояние и убирает пересечения. Навигация до каждой следующей точки открывается в 2ГИС.</small></span></div></aside>
      </section>

      <section className="sales-directory">
        <div className="sales-section-head"><div><p>БАЗА ЗАВЕДЕНИЙ</p><h2>Все точки зоны {selectedZone.id}</h2></div><span>{allZoneLeads.length} найдено</span></div>
        <form className="sales-filters" action={basePath}><input type="hidden" name="zone" value={selectedZone.id}/><label className="sales-search"><Search size={17}/><input name="q" defaultValue={params.q} placeholder="Название или адрес"/></label><select name="segment" defaultValue={params.segment??""}><option value="">Все сегменты</option>{segments.map((segment)=><option key={segment}>{segment}</option>)}</select><select name="status" defaultValue={params.status??""}><option value="">Все этапы</option>{FIELD_SALES_STATUSES.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select><button>Показать</button></form>
        <div className="sales-lead-list">{allZoneLeads.slice(0,120).map((lead,index)=>{
          const instagram=safeExternalUrl(lead.instagram_url),website=safeExternalUrl(lead.website_url),map=safeExternalUrl(lead.map_url);
          return <article key={lead.id} className={openedLead?.id===lead.id?"is-open":""}><div className="sales-lead-rank">{lead.route_day===today()&&lead.route_position?<b>{lead.route_position}</b>:<span>{index+1}</span>}<small>{lead.priority_score}</small></div><div className="sales-lead-main"><div className="sales-lead-title"><div><b>{lead.name}</b><span>{lead.segment} · {lead.subsegment}</span></div><span className={`sales-status ${statusClass[lead.status]}`}>{statusLabel(lead.status)}</span></div><p>{lead.address||"Адрес нужно уточнить"}</p><div className="sales-links">{lead.phone&&<a href={`tel:${lead.phone.replace(/[^+\d]/g,"")}`}><Phone size={14}/>{lead.phone}</a>}{instagram&&<a href={instagram} target="_blank" rel="noreferrer"><Instagram size={14}/>Instagram</a>}{website&&<a href={website} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Сайт</a>}{map&&<a href={map} target="_blank" rel="noreferrer"><MapPinned size={14}/>2ГИС</a>}</div>{lead.reminder_at&&<div className={`sales-reminder ${new Date(lead.reminder_at)<new Date()?"is-overdue":""}`}><BellRing size={14}/>{new Date(lead.reminder_at).toLocaleString("ru-RU",{timeZone:"Asia/Almaty"})} · {lead.next_action||"Связаться"}</div>}</div><Link className="sales-open" href={{pathname:basePath,query:{...params,zone:selectedZone.id,lead:openedLead?.id===lead.id?undefined:lead.id}}}>{openedLead?.id===lead.id?"Закрыть":"Открыть"}</Link>
          {openedLead?.id===lead.id&&<form action={updateFieldSalesLead} className="sales-lead-form"><input type="hidden" name="leadId" value={lead.id}/><label>Этап<select name="status" defaultValue={lead.status}>{FIELD_SALES_STATUSES.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Контакт<input name="contactName" defaultValue={lead.contact_name??""} placeholder="Имя"/></label><label>Должность<input name="contactRole" defaultValue={lead.contact_role??""} placeholder="Владелец / управляющий"/></label><label>Телефон контакта<input name="contactPhone" defaultValue={lead.contact_phone??""}/></label><label>Общий телефон<input name="phone" defaultValue={lead.phone??""}/></label><label>Instagram<input name="instagramUrl" defaultValue={lead.instagram_url??""} placeholder="https://instagram.com/..."/></label><label>Сайт<input name="websiteUrl" defaultValue={lead.website_url??""} placeholder="https://..."/></label><label className="is-wide">Что обсудили<textarea name="notes" defaultValue={lead.notes} placeholder="Кто принимает решение, интерес, возражения"/></label><label className="is-wide">Следующий шаг<input name="nextAction" defaultValue={lead.next_action} placeholder="Написать владельцу, показать демо, отправить предложение"/></label><label>Напомнить<input type="datetime-local" name="reminderAt" defaultValue={dateTimeLocal(lead.reminder_at)}/></label><label className="sales-check"><input type="checkbox" name="markVisit" value="1"/> Отметить визит сейчас</label><button className="sales-primary">Сохранить карточку</button></form>}</article>})}</div>
        {allZoneLeads.length>120&&<p className="sales-limit-note">Показаны первые 120 точек по приоритету. Используйте поиск и фильтры — в маршруте учитывается весь отфильтрованный список.</p>}
      </section>

      <details id="new-lead" className="sales-new-lead"><summary><Plus size={18}/> Добавить заведение вручную</summary><form action={createFieldSalesLead}><label>Название<input name="name" required/></label><label>Зона<select name="zoneId" defaultValue={selectedZone.id}>{zones.map((zone)=><option key={zone.id} value={zone.id}>{zone.id} · {zone.name}</option>)}</select></label><label>Сегмент<input name="segment" placeholder="Одежда, еда, цветы..."/></label><label>Подсегмент<input name="subsegment" placeholder="Мужская одежда, кофейня..."/></label><label className="is-wide">Адрес<input name="address"/></label><label>Телефон<input name="phone"/></label><label>Instagram<input name="instagramUrl"/></label><label>Сайт<input name="websiteUrl"/></label><label>2ГИС<input name="mapUrl"/></label><label>Долгота<input name="longitude" type="number" step="any"/></label><label>Широта<input name="latitude" type="number" step="any"/></label><button className="sales-primary">Добавить в базу</button></form></details>
    </div>
  </main>;
}
