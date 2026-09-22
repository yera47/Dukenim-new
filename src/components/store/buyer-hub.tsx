"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Gift,ShoppingBag,ArrowRight,Check,Copy} from "lucide-react";
import {PickupLocationCard} from "./pickup-location";
import {buyerOrderProgress} from "@/lib/buyer-order-progress";
import {ruleDescription,type LoyaltyProgress} from "@/lib/loyalty";
import {PhoneAuth} from "./phone-auth";
import {money} from "@/lib/demo-data";
import {SocialAuthButtons} from "@/components/auth/social-auth-buttons";
import styles from "./buyer-hub.module.css";
type Order={id:string;order_number:number;status:string;payment_status:string;payment_method?:string|null;kaspi_invoice_sent_at?:string|null;total:number;delivery_method:string;requested_for?:string|null;created_at:string;fulfilment_snapshot?:{pickup?:unknown;zone?:{provider?:string}};reservation?:{status:string;expires_at:string}|null;reward_label:string|null;loyalty_discount:number;items:{title:string;qty:number;price:number;options?:string[];comboParent?:number|null}[]};
export type BuyerHistory={orders:Order[];kaspiRemoteLink?:string|null;signedIn:boolean;phoneVerified:boolean;smsConsent:boolean;program:{name:string;enabled:boolean;terms:string}|null;rules:LoyaltyProgress[];referralCode:string|null};
const empty:BuyerHistory={orders:[],kaspiRemoteLink:null,signedIn:false,phoneVerified:false,smsConsent:false,program:null,rules:[],referralCode:null};
const demoHistory:BuyerHistory={...empty,program:{name:"Клуб гостей",enabled:true,terms:"Пример программы. В своём кафе вы зададите собственные условия."},rules:[{rule:{id:"demo",trigger:"product",threshold:6,category:"Кофе",reward:"gift",label:"Седьмой кофе — наш",value:1,minOrder:0,expiryDays:0,repeat:true,earnOnReward:false},progress:0,active:true,available:null}]};
function RemoteKaspiPayment({order,link}:{order:Order;link:string|null}){
 const[ready,setReady]=useState(false);
 if(order.payment_method!=="kaspi"||(order.status==="cancelled"&&order.payment_status!=="refunded"))return null;
 return <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
  <b>{order.payment_status==="paid"?"Магазин подтвердил оплату":order.payment_status==="refunded"?"Возврат подтверждён магазином":"Ожидает оплаты"}</b>
  {order.payment_status==="pending"&&<><p className="mt-2">{order.kaspi_invoice_sent_at?"Магазин отправил счёт на ваш номер. Откройте Kaspi.kz → Сообщения → Удалённая оплата.":"Магазин может отправить счёт на ваш номер. После оплаты он проверит поступление и подтвердит заказ."}</p>
   {link&&<div className="mt-3"><p>К оплате за товары: <strong>{money(order.total)}</strong>. Откройте Kaspi и введите эту сумму вручную. В комментарии укажите «Заказ №{order.order_number}».</p>{ready?<><p className="mt-2 font-semibold">Проверьте сумму в Kaspi перед подтверждением. Возврат в магазин сам по себе не подтверждает оплату.</p><a href={link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-xl bg-sky-950 px-4 py-3 font-bold text-white">Перейти в Kaspi и ввести {money(order.total)} ↗</a></>:<button type="button" onClick={()=>setReady(true)} className="mt-3 rounded-xl border border-sky-900 px-4 py-3 font-bold">Оплатить {money(order.total)}</button>}</div>}
  </>}
 </div>;
}
function OrderJourney({order}:{order:Order}){
 const {closed,pickup,ready}=buyerOrderProgress(order);
 const paymentVerified=order.payment_status==="paid";
 const canAdvance=order.payment_method!=="kaspi"||paymentVerified;
 const stages=[
  {label:"Заказ сформирован",done:true},
  {label:order.payment_method==="kaspi"?"Оплата подтверждена магазином":"Оплата при получении",done:paymentVerified},
  {label:"Заказ подтверждён магазином",done:canAdvance&&order.status!=="new"},
  {label:pickup?"Доступен для самовывоза":"Доставка",done:canAdvance&&(pickup?ready:order.status==="delivering"||order.status==="done")},
 ];
 if(closed)return null;
 return <ol className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm" aria-label="Этапы заказа">
  {stages.map((stage,index)=><li key={stage.label} className={`flex items-center gap-3 ${stage.done?"text-slate-900":"text-slate-500"}`}><span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${stage.done?"bg-emerald-100 text-emerald-800":"bg-slate-100 text-slate-500"}`}>{stage.done?"✓":index+1}</span>{stage.label}</li>)}
  {order.payment_method==="kaspi"&&order.payment_status==="pending"&&<li className="pl-9 font-semibold text-sky-900">Сейчас: ожидает оплаты · {money(order.total)}</li>}
  {order.fulfilment_snapshot?.zone?.provider==="yandex"&&<li className="pl-9 text-slate-600">Цену курьера магазин согласует с вами отдельно и сам оформит доставку после оплаты.</li>}
 </ol>;
}
export function BuyerHub({slug,base=`/s/${slug}`,demo=false,phoneAuthAvailable=true}:{slug:string;base?:string;demo?:boolean;phoneAuthAvailable?:boolean}){
 const[data,setData]=useState<BuyerHistory>(demo?demoHistory:empty),[error,setError]=useState(""),[loading,setLoading]=useState(!demo),[offset,setOffset]=useState(0),[tab,setTab]=useState<"orders"|"card">("orders"),[reload,setReload]=useState(0),[copied,setCopied]=useState(false);
 useEffect(()=>{
  if(demo)return;let disposed=false;const controller=new AbortController();
  async function load(){if(document.visibilityState==="hidden")return;try{const response=await fetch(`/api/buyer-history?slug=${encodeURIComponent(slug)}&offset=${offset}`,{cache:"no-store",signal:controller.signal});const value=await response.json();if(!response.ok)throw new Error(value.error);if(!disposed){setData(value);setError("");}}catch(cause){if(!disposed)setError(cause instanceof Error?cause.message:"Нет связи");}finally{if(!disposed)setLoading(false);}}
  void load();const timer=setInterval(load,15000);document.addEventListener("visibilitychange",load);return()=>{disposed=true;controller.abort();clearInterval(timer);document.removeEventListener("visibilitychange",load);};
 },[slug,offset,demo,reload]);
 return <main className={styles.root}>
  <Link className={styles.back} href={base}>← В меню</Link><div className={styles.heading}><div><p>ВАШЕ МЕСТО В КАФЕ</p><h1>Всегда под рукой</h1></div><Gift size={29}/></div>
  <nav className={styles.tabs} aria-label="Личный раздел"><button type="button" aria-pressed={tab==="orders"} onClick={()=>setTab("orders")}><ShoppingBag size={17}/>Мои заказы</button><button type="button" aria-pressed={tab==="card"} onClick={()=>setTab("card")}><Gift size={17}/>Моя карта</button></nav>
  {demo&&<p className={styles.notice}>Демонстрация: реальные заказы и начисления здесь отключены.</p>}
  {!demo&&!loading&&!data.signedIn&&(phoneAuthAvailable?<div className={styles.login}><PhoneAuth slug={slug} compact onAuthenticated={()=>setReload(value=>value+1)}/></div>:<div className={styles.login}><p className={styles.notice}>Заказы доступны в этом браузере. Войдите через Google здесь, чтобы сохранить их в аккаунте и открыть на другом устройстве. Номер телефона для заказа всё равно нужен магазину.</p><SocialAuthButtons mode="buyer" next={`${base}/orders`}/></div>)}
  {error&&<p role="alert" className={styles.notice}>{error} Ранее показанные данные могут быть неактуальны.</p>}
  {loading?<p role="status">Загружаем вашу историю…</p>:tab==="card"?<div className={styles.cards}>
   {!data.rules.length&&<div className={styles.empty}><Gift size={36}/><h2>Карта скоро появится</h2><p>Заведение ещё не настроило программу лояльности.</p></div>}
   {data.rules.map(progress=>{const rule=progress.rule;const count=progress.available?rule.threshold:rule.repeat?progress.progress%rule.threshold:Math.min(progress.progress,rule.threshold);return <section key={rule.id} className={styles.card}><div className={styles.cardTop}><span>{data.program?.name??"Клуб гостей"}{!progress.active?" · прежние условия":""}</span><Gift size={23}/></div><h2>{rule.label}</h2><p>{ruleDescription(rule)}</p>{rule.trigger!=="spend"&&rule.threshold<=12?<div className={styles.stamps}>{Array.from({length:rule.threshold},(_,i)=><span key={i} data-filled={i<count}>{i<count?<Check size={17}/>:i+1}</span>)}<span data-filled={Boolean(progress.available)}><Gift size={17}/></span></div>:<div className={styles.progress}><i style={{width:`${Math.min(100,count/rule.threshold*100)}%`}}/></div>}<div className={styles.cardFooter}><b>{progress.available?"Награда готова":`${count.toLocaleString("ru-RU")} / ${rule.threshold.toLocaleString("ru-RU")}`}</b><span>{progress.available?"Выберите её при оформлении заказа":"Копите с каждой покупкой"}</span></div>{progress.available?.expiresAt&&<small>Используйте до {new Date(progress.available.expiresAt).toLocaleDateString("ru-KZ")}</small>}{rule.minOrder>0&&<small>Минимальный заказ: {money(rule.minOrder)}</small>}{!rule.repeat&&<small>Награда выдаётся один раз</small>}{rule.trigger==="referral"&&data.referralCode&&<button type="button" className={styles.share} onClick={()=>{void navigator.clipboard.writeText(`${window.location.origin}${base}?ref=${data.referralCode}`).then(()=>setCopied(true)).catch(()=>setError("Не удалось скопировать ссылку."));}}><Copy size={16}/>{copied?"Ссылка скопирована":"Пригласить друга"}</button>}</section>;})}
   {data.program&&<div className={styles.terms}><b>Как это работает</b><p>Прогресс начисляется после оплаты и выдачи заказа. Отменённые покупки и возвраты не учитываются. Награду можно выбрать при следующем заказе, одну за раз.</p>{data.rules.some(item=>item.rule.trigger==="referral")&&<p>Скопируйте свою ссылку и отправьте другу. Он откроет меню и оформит заказ. Чтобы приглашение засчиталось, другу нужно войти в аккаунт с этого браузера; награда начислится после оплаты и выдачи заказа.</p>}{!data.program.enabled&&<p>Начисления по новым заказам приостановлены. Доступные награды можно использовать.</p>}{data.program.terms&&<p>{data.program.terms}</p>}</div>}
   {data.phoneVerified&&<div className={styles.terms}><b>SMS от магазина</b><p>{data.smsConsent?"Вы получаете акции, на которые согласились.":"Рекламные сообщения отключены. Статусы ваших заказов могут приходить отдельно."}</p><button type="button" className={styles.share} onClick={async()=>{const next=!data.smsConsent;const response=await fetch("/api/buyer-history",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,enabled:next})});if(response.ok)setData(current=>({...current,smsConsent:next}));else setError("Не удалось изменить SMS-настройку.");}}>{data.smsConsent?"Отключить акции по SMS":"Получать акции по SMS"}</button></div>}
  </div>:<div className={styles.orders}>
   {!data.orders.length&&<div className={styles.empty}><ShoppingBag size={36}/><h2>Ваш первый заказ впереди</h2><p>Здесь будут состав, статус и история покупок.</p><Link href={base}>Выбрать что-нибудь вкусное<ArrowRight size={16}/></Link></div>}
   {data.orders.slice(0,20).map(order=>{const {pickup,index,closed,expired}=buyerOrderProgress(order);const labels=pickup?["Ожидает подтверждения магазина","Готовим","Можно забрать","Выдан"]:["Ожидает подтверждения магазина","Готовим","В пути","Доставлен"];const status=order.payment_status==="refunded"?"Оплата возвращена":closed?(expired?"Бронь истекла":"Отменён"):order.payment_method==="kaspi"&&order.payment_status==="pending"?"Ожидает оплаты Kaspi":labels[index];return <article key={order.id} className={styles.order}><div className={styles.orderHead}><div><b>{order.reservation?"Бронь":"Заказ"} №{order.order_number}</b><p>{new Date(order.created_at).toLocaleString("ru-KZ")}</p></div><span>{status}</span></div><p className={styles.items}>{order.items?.map(i=>`${i.title} × ${i.qty}`).join(" · ")}</p>{order.fulfilment_snapshot?.zone?.provider==="yandex"&&<p className="text-sm font-semibold">Курьера закажет магазин · цену доставки сообщат отдельно</p>}<RemoteKaspiPayment order={order} link={data.kaspiRemoteLink??null}/><OrderJourney order={order}/><div className={styles.orderBottom}><strong>{money(order.total)}</strong><details><summary>Детали заказа</summary><div className={styles.details}>{order.items?.map((item,i)=><p key={i}><span>{item.title} × {item.qty}{item.options?.length?<small className="mt-1 block text-neutral-500">{item.options.join(" · ")}</small>:null}{item.comboParent?<small className="block text-neutral-400">В составе комбо</small>:null}</span><b>{money(item.price*item.qty)}</b></p>)}{order.reward_label&&<p>Награда: {order.reward_label}</p>}{order.loyalty_discount>0&&<p>Скидка: −{money(order.loyalty_discount)}</p>}<p>{order.payment_status==="paid"?"Оплачен":order.payment_status==="refunded"?"Оплата возвращена":order.payment_method==="kaspi"?"Ожидает оплаты через Kaspi":"Оплата при получении"}</p><p>{order.requested_for?`Ко времени: ${new Date(order.requested_for).toLocaleString("ru-KZ")}`:"Как можно скорее"}</p>{pickup&&<PickupLocationCard value={order.fulfilment_snapshot?.pickup}/>}</div></details></div></article>;})}
   {(offset>0||data.orders.length>20)&&<div className={styles.pagination}><button type="button" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-20))}>← Новее</button><button type="button" disabled={data.orders.length<=20} onClick={()=>setOffset(offset+20)}>Раньше →</button></div>}
  </div>}
 </main>;
}
