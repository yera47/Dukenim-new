"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { consultationSchema, type Consultation, type ConsultationTurn } from "@/lib/ai/consultation-schema";
import styles from "./studio-conversation.module.css";

const labels={hero:"Подготовить текст",store_design:"Подготовить оформление",catalog_structure:"Подготовить разделы",promotion:"Подготовить акцию"};
const helpLinks={payments:["/admin/requests?source=integrations&intent=card-payments","Заявка на онлайн-оплату"],kaspi:["/admin/requests?source=integrations&intent=kaspi-payments","Заявка на Kaspi Pay"],integrations:["/admin/integrations","Выбрать подключение"],delivery:["/admin/settings/delivery","Настроить получение заказа"],team:["/admin/team","Открыть сотрудников"],analytics:["/admin/analytics","Открыть аналитику"],campaigns:["/admin/catalog/campaigns","Открыть акции"],support:["/admin/requests?source=ai-studio","Написать в поддержку"]} as const;
export function StudioConversation({enabled,onTask,children,onBanner,stageHint,endpoint="/api/ai-studio/draft",staff=false,designOnly=false,working=false}:{enabled:boolean;onTask?:(task:NonNullable<Consultation["task"]>)=>void;children?:React.ReactNode;onBanner?:(brief:string)=>void;stageHint?:string;endpoint?:string;staff?:boolean;designOnly?:boolean;working?:boolean}) {
  const [turns,setTurns]=useState<ConsultationTurn[]>([]);
  const [message,setMessage]=useState("");
  const [includeBrandLogo,setIncludeBrandLogo]=useState(false);
  const [loading,setLoading]=useState(true);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    void fetch(endpoint,{cache:"no-store",signal:controller.signal}).then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Не удалось загрузить историю.");
      if(!controller.signal.aborted)setTurns(data.turns??[]);
    }).catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"История недоступна.");})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[endpoint]);
  async function send() {
    if(!enabled||loading||pending||message.trim().length<2)return;
    const sent=message.trim();setPending(true);setError("");
    try {
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({intent:"consultation",brief:sent,includeBrandLogo})});
      const data=await response.json();
      const parsed=consultationSchema.safeParse(data.consultation);
      if(!response.ok||!parsed.success||typeof data.generationId!=="string")throw new Error(data.error||"Ответ не подтверждён. Ваш текст остался в поле.");
      setTurns(previous=>[...previous,{id:data.generationId,message:sent,response:parsed.data}]);setMessage("");setIncludeBrandLogo(false);
    } catch(cause){setError(cause instanceof Error?cause.message:"Связь прервалась. Проверьте историю перед повторной отправкой.");}
    finally{setPending(false);}
  }
  return <section className={`${styles.workspace} mx-auto w-full max-w-3xl space-y-5`} aria-label="Диалог с AI Studio">
    <header><h2 className="text-2xl font-semibold">Соберём ваш магазин вместе</h2><p className="mt-2 text-sm text-neutral-500">Расскажите, что продаёте. Обсудим оформление и разделы — по одному шагу. Предложения не публикуются без вашего решения.</p></header>
    <div className="space-y-5" aria-live="polite" aria-busy={loading||pending}>
      {loading?<p>Загружаю разговор…</p>:turns.length===0?<p className="rounded-2xl border p-5">{stageHint??"Что изменим в вашем магазине?"}</p>:null}
      {stageHint&&turns.length>1&&<details className="text-sm"><summary className="cursor-pointer text-neutral-500">Ранние сообщения · {turns.length-1}</summary>{turns.slice(0,-1).map(turn=><article key={turn.id} className="mt-3 space-y-2"><p className="font-medium">{turn.message}</p><p>{turn.response.reply}</p></article>)}</details>}
      {(stageHint?turns.slice(-1):turns).map(turn=><article key={turn.id} className="space-y-3">
        <p className={`${styles.userMessage} ml-8 whitespace-pre-wrap break-words rounded-2xl p-4`}><span className="sr-only">Вы: </span>{turn.message}</p>
        <div className="mr-4 space-y-3 p-2"><p className="whitespace-pre-wrap break-words"><span className="sr-only">AI Studio: </span>{turn.response.reply}</p>
          {turn.response.task&&onTask&&(!designOnly||turn.response.task.intent==="store_design")&&<button type="button" className="btn btn-secondary" disabled={pending||!enabled} onClick={()=>onTask(turn.response.task!)}>{labels[turn.response.task.intent]}</button>}
          {!staff&&turn.response.help&&<Link className="btn btn-secondary" href={helpLinks[turn.response.help][0]}>{helpLinks[turn.response.help][1]} →</Link>}
        </div>
      </article>)}
      {pending&&<p>Обдумываю ваш ответ…</p>}
    </div>
    {children && <div className={`${styles.steps} space-y-4`} aria-label="Текущий шаг создания магазина">{children}</div>}
    <form onSubmit={event=>{event.preventDefault();void send();}} className={`${styles.composer} sticky bottom-3 z-10 rounded-2xl border bg-white p-4 shadow-sm`}>
      <label htmlFor="studio-conversation" className="sr-only">Сообщение AI Studio</label>
      {!stageHint&&<details className="mb-3 text-sm"><summary className="cursor-pointer text-neutral-500">Добавить контекст бренда</summary><label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={includeBrandLogo} disabled={pending} onChange={event=>setIncludeBrandLogo(event.target.checked)}/>Проанализировать сохранённый логотип в этом сообщении</label></details>}
      <textarea id="studio-conversation" className="w-full resize-y bg-transparent outline-none" rows={3} value={message} maxLength={800} disabled={pending} onChange={event=>setMessage(event.target.value)} placeholder="Например: Серик Шоп, одежда для города. Хочу спокойный светлый магазин."/>
      <div className="flex flex-wrap items-center justify-between gap-3">{staff?<span className="text-sm">Права меняет владелец магазина.</span>:<Link href="/admin/requests?source=ai-studio" className="text-sm underline">Написать в поддержку</Link>}<button className="btn btn-primary" disabled={!enabled||loading||pending||message.trim().length<2}>{pending?"Отправляю…":"Отправить"}</button></div>
      {onBanner&&<details className="mt-3 text-sm"><summary className="cursor-pointer text-neutral-500">Дополнительные действия</summary><button type="button" className="mt-3 underline" disabled={!enabled||pending||message.trim().length<8} onClick={()=>onBanner(message.trim())}>Создать фон баннера по этому сообщению</button></details>}
    </form>
    {!enabled&&!working&&<p className="text-sm text-neutral-500">{staff?"Владелец разрешил только просмотр разговора.":"AI сейчас недоступен. Можно продолжить настройку вручную."}</p>}
    {!stageHint&&<nav aria-label="Настройки магазина" className="flex flex-wrap gap-4 text-sm"><Link href="/admin/settings/delivery" className="underline">Доставка и место самовывоза</Link><Link href="/store-preview" target="_blank" className="underline">Предпросмотр вашего магазина ↗</Link></nav>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
