import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BellRing, CalendarDays, CheckCircle2, Download, ExternalLink, History, Instagram, MapPinned, Navigation, Phone, PhoneCall, Play, Route, Search, Store, Target, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireFieldSalesAccess } from "@/lib/field-sales-access.server";
import { buildVisitRoute, FIELD_SALES_REMINDER_TYPES, FIELD_SALES_STATUSES, reminderTypeLabel, routeLengthKm, safeExternalUrl, statusLabel, type FieldSalesLead } from "@/lib/field-sales";
import type { Database } from "@/types/database";
import { FieldSalesScroll } from "@/components/field-sales-scroll";
import { cancelFieldSalesTrip, completeFieldSalesReminder, completeFieldSalesStop, createFieldSalesLead, startFieldSalesTrip, updateFieldSalesLead } from "./actions";

export const dynamic = "force-dynamic";
type Zone = Database["public"]["Tables"]["field_sales_zones"]["Row"];
type Params = { zone?: string; segment?: string; status?: string; q?: string; lead?: string; view?: "admin"; date?: string; saved?: string };
type Trip = { id:string;zone_id:string;status:string;started_at:string;completed_at:string|null };
type Stop = { id:string;trip_id:string;lead_id:string;position:number;state:string;outcome:string|null;feedback:string;lead:FieldSalesLead };

const statusClass:Record<string,string>={new:"is-slate",planned:"is-blue",contacted:"is-violet",negotiating:"is-amber",demo:"is-orange",follow_up:"is-pink",won:"is-green",lost:"is-red",do_not_contact:"is-gray"};
const worked = (lead:Pick<FieldSalesLead,"status"|"last_visit_at">) => Boolean(lead.last_visit_at) || !["new","planned"].includes(lead.status);
const localInputValue=(value:string|null)=>value?new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Almaty",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value)).replace(" ","T"):"";
const dayValue=(date:Date)=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Almaty",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
const displayDate=(value:string)=>new Date(value).toLocaleString("ru-RU",{timeZone:"Asia/Almaty",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
const reminderIcon=(type:string)=>type==="call"?<PhoneCall size={17}/>:type==="meeting"?<Users size={17}/>:<BellRing size={17}/>;
function salesUrl(basePath:string,params:Params,overrides:Record<string,string|undefined>={}){const query=new URLSearchParams();for(const [key,value] of Object.entries({...params,saved:undefined,...overrides,view:undefined}))if(value)query.set(key,value);return `${basePath}?${query.toString()}`;}

function MapView({ zone, leads }:{zone:Zone;leads:FieldSalesLead[]}) {
  return <div className="sales-real-map">
    <Image src={`/api/field-sales/map?zone=${zone.id}`} alt={`Карта 2ГИС: ${zone.name}`} width={1200} height={760} unoptimized/>
    {leads.filter(x=>x.longitude!==null&&x.latitude!==null).map((lead,index)=>{
      const left=4+((Number(lead.longitude)-Number(zone.west))/(Number(zone.east)-Number(zone.west)))*92;
      const top=4+((Number(zone.north)-Number(lead.latitude))/(Number(zone.north)-Number(zone.south)))*92;
      return <a key={lead.id} className="sales-map-pin" style={{left:`${Math.max(3,Math.min(97,left))}%`,top:`${Math.max(3,Math.min(97,top))}%`}} href={safeExternalUrl(lead.map_url)??"#"} target="_blank" rel="noreferrer" title={lead.name}>{index+1}</a>;
    })}
    <div className="sales-map-caption"><span><MapPinned size={16}/>{zone.id} · {zone.name}</span><small>Подложка и дороги 2ГИС · нажмите точку для навигации</small></div>
  </div>;
}

export default async function FieldSalesPage({searchParams}:{searchParams:Promise<Params>}) {
  const context=await requireFieldSalesAccess();
  const params=await searchParams;
  const basePath=params.view==="admin"?"/admin/sales":"/root/sales";
  const client=createAdminClient();
  // Trip tables are server-only and intentionally excluded from the browser database surface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db=client as any;
  const agendaDate=/^\d{4}-\d{2}-\d{2}$/.test(params.date??"")?params.date!:dayValue(new Date());
  const dayStart=new Date(`${agendaDate}T00:00:00+05:00`).toISOString();
  const dayEnd=new Date(`${agendaDate}T23:59:59.999+05:00`).toISOString();
  const [zonesResult,activeTripResult,leadPages,historyResult,dueResult,agendaResult]=await Promise.all([
    client.from("field_sales_zones").select("*").eq("active",true).order("sort_order"),
    db.from("field_sales_trips").select("*").eq("actor_id",context.user!.id).eq("status","active").maybeSingle(),
    Promise.all([0,1000,2000].map(from=>client.from("field_sales_leads").select("id,zone_id,status,last_visit_at").range(from,from+999))),
    db.from("field_sales_trips").select("*").eq("actor_id",context.user!.id).neq("status","active").order("started_at",{ascending:false}).limit(8),
    client.from("field_sales_leads").select("id",{count:"exact",head:true}).not("reminder_at","is",null).is("reminder_completed_at",null).lte("reminder_at",new Date().toISOString()).not("status","in","(won,lost,do_not_contact)"),
    client.from("field_sales_leads").select("*").not("reminder_at","is",null).is("reminder_completed_at",null).gte("reminder_at",dayStart).lte("reminder_at",dayEnd).order("reminder_at").limit(100),
  ]);
  const zones=(zonesResult.data??[]) as Zone[];
  const activeTrip=(activeTripResult.data??null) as Trip|null;
  const selectedZone=zones.find(z=>z.id===(params.zone??activeTrip?.zone_id))??zones[0];
  if(!selectedZone) return <main className="field-sales-shell"><div className="container field-sales-body">База зон не загружена.</div></main>;
  let leadQuery=client.from("field_sales_leads").select("*").eq("zone_id",selectedZone.id).order("priority_score",{ascending:false});
  if(params.segment) leadQuery=leadQuery.eq("segment",params.segment);
  if(params.status) leadQuery=leadQuery.eq("status",params.status as FieldSalesLead["status"]);
  if(params.q?.trim()){const q=params.q.trim().replace(/[,%()]/g,"");leadQuery=leadQuery.or(`name.ilike.%${q}%,address.ilike.%${q}%`);}
  const leadsResult=await leadQuery;
  const leads=(leadsResult.data??[]) as FieldSalesLead[];
  const route=buildVisitRoute(leads,20);
  const allProgress=leadPages.flatMap(x=>x.data??[]) as Array<Pick<FieldSalesLead,"id"|"zone_id"|"status"|"last_visit_at">>;
  const zoneProgress=new Map(zones.map(zone=>{const rows=allProgress.filter(x=>x.zone_id===zone.id);const done=rows.filter(worked).length;return [zone.id,{total:rows.length,done,percent:rows.length?Math.round(done/rows.length*100):0}];}));
  let activeStops:Stop[]=[];
  if(activeTrip){const result=await db.from("field_sales_trip_stops").select("*,lead:field_sales_leads(*)").eq("trip_id",activeTrip.id).order("position");activeStops=(result.data??[]) as Stop[];}
  const currentStop=activeStops.find(x=>x.state==="current");
  const completedStops=activeStops.filter(x=>["completed","skipped"].includes(x.state)).length;
  const segments=[...new Set(leads.map(x=>x.segment))].sort((a,b)=>a.localeCompare(b,"ru"));
  const openedLead=leads.find(x=>x.id===params.lead);
  const progress=zoneProgress.get(selectedZone.id)??{total:leads.length,done:0,percent:0};
  const history=(historyResult.data??[]) as Trip[];
  const agenda=(agendaResult.data??[]) as FieldSalesLead[];

  return <main className="field-sales-shell">
    {openedLead&&<FieldSalesScroll leadId={openedLead.id}/>} 
    <header className="field-sales-header"><div className="container"><div><Link href={params.view==="admin"?"/admin":"/root"} className="field-sales-back"><ArrowLeft size={16}/> Назад в панель</Link><p>DUKENIM · ВЫЕЗДНЫЕ ПРОДАЖИ</p><h1>Маршрут по Астане</h1><span>126 компактных зон по 7–20 заведений. Открывайте одну точку, фиксируйте результат — следующая появится сама.</span></div><div className="field-sales-header-actions"><a href={`${basePath}/export`} className="sales-secondary"><Download size={17}/> Выгрузить</a></div></div></header>
    <div className="container field-sales-body">
      {activeTrip&&activeTrip.zone_id!==selectedZone.id&&<section className="sales-warning"><b>Поездка уже идёт</b><span>Завершите текущий маршрут перед новой зоной.</span><Link href={`${basePath}?zone=${activeTrip.zone_id}`}>Вернуться к поездке</Link></section>}
      <section className="sales-zone-control"><div><p>ЗОНА ПО ПОРЯДКУ</p><h2>{selectedZone.name}</h2><span>{progress.done} из {progress.total} проверено</span></div><form action={basePath}><select name="zone" defaultValue={selectedZone.id}>{zones.map(z=>{const p=zoneProgress.get(z.id);return <option key={z.id} value={z.id}>{z.id} · {z.name} · {p?.percent??0}%</option>})}</select><button>Открыть</button></form><div className="sales-progress"><i style={{width:`${progress.percent}%`}}/><b>{progress.percent}%</b></div></section>
      <section className="sales-kpis"><article><Store/><span><small>Зон</small><b>{zones.length}</b></span></article><article><Target/><span><small>Точек в базе</small><b>{allProgress.length}</b></span></article><article><CheckCircle2/><span><small>Проверено</small><b>{allProgress.filter(worked).length}</b></span></article><article className={(dueResult.count??0)>0?"is-alert":""}><BellRing/><span><small>Напоминания</small><b>{dueResult.count??0}</b></span></article></section>

      <section className="sales-agenda"><div className="sales-section-head"><div><p>ДЕЛА И ВСТРЕЧИ</p><h2>План на {new Date(`${agendaDate}T12:00:00+05:00`).toLocaleDateString("ru-RU",{day:"numeric",month:"long"})}</h2></div><form action={basePath} className="sales-calendar-pick"><input type="hidden" name="zone" value={selectedZone.id}/><CalendarDays size={17}/><input type="date" name="date" defaultValue={agendaDate}/><button>Показать</button></form></div>{agenda.length?<div className="sales-agenda-list">{agenda.map(item=><article key={item.id} className={new Date(item.reminder_at!).getTime()<Date.now()?"is-overdue":""}><span>{reminderIcon(item.reminder_type)}</span><div><b>{reminderTypeLabel(item.reminder_type)} · {displayDate(item.reminder_at!)}</b><strong>{item.name}</strong><small>{item.next_action||item.address||"Откройте карточку и уточните следующий шаг"}</small></div><Link href={`${salesUrl(basePath,params,{zone:item.zone_id,lead:item.id})}#lead-${item.id}`}>Открыть</Link><form action={completeFieldSalesReminder}><input type="hidden" name="leadId" value={item.id}/><input type="hidden" name="returnTo" value={salesUrl(basePath,params,{date:agendaDate})}/><button aria-label={`Завершить: ${item.name}`}><CheckCircle2 size={19}/></button></form></article>)}</div>:<div className="sales-agenda-empty"><CheckCircle2/><span><b>На этот день дел нет</b><small>Добавьте звонок, встречу или задачу в карточке заведения.</small></span></div>}</section>

      {activeTrip&&activeTrip.zone_id===selectedZone.id&&currentStop?<section className="sales-live-trip">
        <div className="sales-live-head"><span>ВЫ В ПУТИ · {completedStops+1} ИЗ {activeStops.length}</span><div className="sales-progress"><i style={{width:`${Math.round(completedStops/activeStops.length*100)}%`}}/><b>{Math.round(completedStops/activeStops.length*100)}%</b></div></div>
        <div className="sales-current-stop"><div><small>СЕЙЧАС</small><h2>{currentStop.lead.name}</h2><p>{currentStop.lead.segment} · {currentStop.lead.address}</p><div className="sales-links">{currentStop.lead.phone&&<a href={`tel:${currentStop.lead.phone.replace(/[^+\d]/g,"")}`}><Phone size={15}/>{currentStop.lead.phone}</a>}{safeExternalUrl(currentStop.lead.instagram_url)&&<a href={safeExternalUrl(currentStop.lead.instagram_url)!} target="_blank" rel="noreferrer"><Instagram size={15}/>Instagram</a>}</div></div><a className="sales-nav-button" href={safeExternalUrl(currentStop.lead.map_url)??"#"} target="_blank" rel="noreferrer"><Navigation size={18}/> Маршрут в 2ГИС</a></div>
        <form action={completeFieldSalesStop} className="sales-feedback"><input type="hidden" name="stopId" value={currentStop.id}/><label>Итог<select name="outcome" required defaultValue=""><option value="" disabled>Выберите результат</option><option value="interested">Заинтересован</option><option value="follow_up">Вернуться позже</option><option value="not_available">Не застал владельца</option><option value="connected">Подключён</option><option value="refused">Отказ</option></select></label><label>Что ответили<textarea name="feedback" placeholder="Имя, возражение, договорённость"/></label><label>Тип<select name="reminderType" defaultValue="task">{FIELD_SALES_REMINDER_TYPES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label><label>Дата и время<input type="datetime-local" name="reminderAt"/></label><button className="sales-primary">Сохранить и открыть следующую</button></form>
        <details><summary>Весь маршрут и история этой поездки</summary><ol className="sales-route-list">{activeStops.map(stop=><li key={stop.id} className={`is-${stop.state}`}><span>{stop.position}</span><div><b>{stop.lead.name}</b><small>{stop.state==="current"?"Сейчас":stop.state==="queued"?"Далее":stop.outcome??"Проверено"}</small></div></li>)}</ol><form action={cancelFieldSalesTrip}><input type="hidden" name="tripId" value={activeTrip.id}/><button className="sales-cancel-trip">Завершить поездку досрочно</button></form></details>
      </section>:<section className="sales-workspace"><div className="sales-route-panel"><div className="sales-section-head"><div><p>ЗОНА НА КАРТЕ 2ГИС</p><h2>{route.length} точек по пути</h2></div><span className="sales-distance"><Route size={16}/>{routeLengthKm(route).toFixed(1)} км</span></div><MapView zone={selectedZone} leads={route}/>{route.length>0&&<form action={startFieldSalesTrip} className="sales-start-trip"><input type="hidden" name="zoneId" value={selectedZone.id}/><input type="hidden" name="leadIds" value={JSON.stringify(route.map(x=>x.id))}/><button className="sales-primary" disabled={Boolean(activeTrip)}><Play size={17}/> Начать объезд зоны</button><span>После старта увидите только первую точку и поле обратной связи.</span></form>}</div><aside className="sales-day-panel"><p>СЛЕДУЮЩИЕ ЗОНЫ</p><h2>Едем по порядку</h2>{zones.filter(z=>(zoneProgress.get(z.id)?.percent??0)<100).slice(0,7).map(z=>{const p=zoneProgress.get(z.id)!;return <Link key={z.id} href={`${basePath}?zone=${z.id}`}><b>{z.id}</b><span>{z.name}<small>{p.done}/{p.total} · {p.percent}%</small></span></Link>})}</aside></section>}

      <section className="sales-directory"><div className="sales-section-head"><div><p>ЗАВЕДЕНИЯ ЗОНЫ</p><h2>{selectedZone.id} · {progress.total} точек</h2></div></div>{params.saved&&openedLead&&<div className="sales-save-success" role="status"><CheckCircle2 size={18}/><span><b>Сохранено</b><small>Карточка и задача обновлены без сброса данных.</small></span></div>}<form className="sales-filters" action={basePath}><input type="hidden" name="zone" value={selectedZone.id}/><label className="sales-search"><Search size={17}/><input name="q" defaultValue={params.q} placeholder="Название или адрес"/></label><select name="segment" defaultValue={params.segment??""}><option value="">Все сегменты</option>{segments.map(x=><option key={x}>{x}</option>)}</select><select name="status" defaultValue={params.status??""}><option value="">Все этапы</option>{FIELD_SALES_STATUSES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select><button>Показать</button></form><div className="sales-lead-list">{leads.map((lead,index)=>{const isOpen=openedLead?.id===lead.id;const openUrl=`${salesUrl(basePath,params,{zone:selectedZone.id,lead:isOpen?undefined:lead.id})}${isOpen?"":`#lead-${lead.id}`}`;return <article id={`lead-${lead.id}`} key={lead.id} className={isOpen?"is-open":""}><div className="sales-lead-rank"><span>{index+1}</span><small>{lead.priority_score}</small></div><div className="sales-lead-main"><div className="sales-lead-title"><div><b>{lead.name}</b><span>{lead.segment} · {lead.subsegment}</span></div><span className={`sales-status ${statusClass[lead.status]}`}>{statusLabel(lead.status)}</span></div><p>{lead.address||"Адрес нужно уточнить"}</p><div className="sales-links">{lead.phone&&<a href={`tel:${lead.phone.replace(/[^+\d]/g,"")}`}><Phone size={14}/>{lead.phone}</a>}{safeExternalUrl(lead.instagram_url)&&<a href={safeExternalUrl(lead.instagram_url)!} target="_blank" rel="noreferrer"><Instagram size={14}/>Instagram</a>}{safeExternalUrl(lead.website_url)&&<a href={safeExternalUrl(lead.website_url)!} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Сайт</a>}{safeExternalUrl(lead.map_url)&&<a href={safeExternalUrl(lead.map_url)!} target="_blank" rel="noreferrer"><MapPinned size={14}/>2ГИС</a>}</div>{lead.reminder_at&&!lead.reminder_completed_at&&<span className={`sales-reminder ${new Date(lead.reminder_at).getTime()<Date.now()?"is-overdue":""}`}>{reminderIcon(lead.reminder_type)}{reminderTypeLabel(lead.reminder_type)} · {displayDate(lead.reminder_at)}</span>}</div><Link className="sales-open" href={openUrl}>{isOpen?"Закрыть":"Карточка"}</Link>{isOpen&&<form action={updateFieldSalesLead} className="sales-lead-form"><input type="hidden" name="leadId" value={lead.id}/><input type="hidden" name="returnTo" value={`${salesUrl(basePath,params,{zone:selectedZone.id,lead:lead.id,saved:"1"})}#lead-${lead.id}`}/><label>Этап<select name="status" defaultValue={lead.status}>{FIELD_SALES_STATUSES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label><label>Контакт<input name="contactName" defaultValue={lead.contact_name??""}/></label><label>Должность<input name="contactRole" defaultValue={lead.contact_role??""}/></label><label>Телефон<input type="tel" inputMode="tel" name="contactPhone" defaultValue={lead.contact_phone??""}/></label><label>Общий телефон<input type="tel" inputMode="tel" name="phone" defaultValue={lead.phone??""}/></label><label>Instagram<input type="url" name="instagramUrl" defaultValue={lead.instagram_url??""}/></label><label>Сайт<input type="url" name="websiteUrl" defaultValue={lead.website_url??""}/></label><label className="is-wide">Что обсудили<textarea name="notes" defaultValue={lead.notes}/></label><label className="is-wide">Следующий шаг<input name="nextAction" defaultValue={lead.next_action}/></label><label>Тип<select name="reminderType" defaultValue={lead.reminder_type}>{FIELD_SALES_REMINDER_TYPES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label><label>Дата и время<input type="datetime-local" name="reminderAt" defaultValue={localInputValue(lead.reminder_at)}/></label><label className="sales-check"><input type="checkbox" name="markVisit" value="1"/> Отметить визит</label><button className="sales-primary">Сохранить</button></form>}</article>})}</div></section>
      <section className="sales-history"><div><History/><span><p>ИСТОРИЯ ПОЕЗДОК</p><h2>{history.length?`${history.length} последних маршрутов`:"Поездок пока не было"}</h2></span></div>{history.map(trip=><article key={trip.id}><b>{zones.find(z=>z.id===trip.zone_id)?.name??trip.zone_id}</b><span>{new Date(trip.started_at).toLocaleString("ru-RU",{timeZone:"Asia/Almaty"})}</span><em>{trip.status==="completed"?"Завершена":"Отменена"}</em></article>)}</section>
      <details className="sales-new-lead"><summary>Добавить заведение вручную</summary><form action={createFieldSalesLead}><label>Название<input name="name" required/></label><label>Зона<select name="zoneId" defaultValue={selectedZone.id}>{zones.map(z=><option key={z.id} value={z.id}>{z.id} · {z.name}</option>)}</select></label><label>Сегмент<input name="segment"/></label><label className="is-wide">Адрес<input name="address"/></label><label>Телефон<input name="phone"/></label><label>Instagram<input name="instagramUrl"/></label><label>Сайт<input name="websiteUrl"/></label><label>2ГИС<input name="mapUrl"/></label><button className="sales-primary">Добавить</button></form></details>
    </div>
  </main>;
}
