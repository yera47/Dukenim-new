"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Camera, Check, ChevronRight, FileText, ImagePlus, Mic, Plus, Store, Truck, X } from "lucide-react";
import { AiRequestCard } from "./ai-request-card";
import { consultationSchema, type Consultation, type ConsultationTurn } from "@/lib/ai/consultation-schema";
import styles from "./studio-conversation.module.css";

const labels={hero:"Подготовить текст",store_design:"Подготовить оформление",catalog_structure:"Подготовить разделы",promotion:"Подготовить акцию"};
const helpLinks={payments:["/admin/requests?source=integrations&intent=card-payments","Заявка на онлайн-оплату"],kaspi:["/admin/integrations#kaspi-remote","Настроить Kaspi Pay"],integrations:["/admin/integrations","Выбрать подключение"],delivery:["/admin/settings/delivery","Настроить получение заказа"],team:["/admin/team","Открыть сотрудников"],analytics:["/admin/analytics","Открыть аналитику"],campaigns:["/admin/catalog/campaigns","Открыть акции"],catalog:["/admin/catalog","Открыть каталог"],orders:["/admin/orders","Открыть заказы"],loyalty:["/admin/settings/loyalty","Настроить лояльность"],stories:["/admin/catalog/stories","Открыть истории"],support:["/admin/requests?source=ai-studio","Написать в поддержку"]} as const;
export function StudioConversation({enabled,onTask,children,onBanner,onAttachment,brandDone=false,deliveryDone=false,builderStage,stageHint,endpoint="/api/ai-studio/draft",staff=false,designOnly=false,working=false}:{enabled:boolean;onTask?:(task:NonNullable<Consultation["task"]>)=>void;children?:React.ReactNode;onBanner?:(brief:string)=>void;onAttachment?:(kind:"photo"|"file"|"camera")=>void;brandDone?:boolean;deliveryDone?:boolean;builderStage?:"setup"|"product";stageHint?:string;endpoint?:string;staff?:boolean;designOnly?:boolean;working?:boolean}) {
  const [turns,setTurns]=useState<ConsultationTurn[]>([]);
  const [message,setMessage]=useState("");
  const [includeBrandLogo,setIncludeBrandLogo]=useState(false);
  const [loading,setLoading]=useState(true);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  const [menuOpen,setMenuOpen]=useState(false);
  const scroller=useRef<HTMLDivElement>(null);
  const textarea=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{const node=scroller.current;if(node&&(turns.length>0||pending))node.scrollTo({top:node.scrollHeight,behavior:"smooth"});},[turns,pending,children]);
  useEffect(()=>{const node=textarea.current;if(node){node.style.height="24px";node.style.height=`${Math.min(node.scrollHeight,144)}px`;}},[message]);
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
  function revealAttachment(kind:"photo"|"file"|"camera"){
    if(!onAttachment)return;
    setMenuOpen(false);
    onAttachment(kind);
    window.setTimeout(()=>scroller.current?.scrollTo({top:scroller.current.scrollHeight,behavior:"smooth"}),80);
  }
  return <section className={styles.workspace} aria-label="Диалог с AI Studio">
    <div ref={scroller} className={styles.chatScroll} aria-live="polite" aria-busy={loading||pending}>
     <div className={styles.chatContent}>
      {loading?<p role="status">Загружаю разговор…</p>:turns.length===0?<div className={styles.greeting}><h1>Здравствуйте!</h1><h2>Я помощник вашего магазина.</h2><p>{stageHint??"Помогу настроить магазин, оформить бренд, добавить товары и привлечь покупателей. С чего начнём?"}</p><div className={styles.quickTasks}>
        {builderStage?<button type="button" onClick={()=>scroller.current?.scrollTo({top:scroller.current.scrollHeight,behavior:"smooth"})}><span className={styles.taskIcon}><Store size={23}/></span><span><b>{builderStage==="setup"?"Создать магазин":"Добавить первый товар"}</b><small>{builderStage==="setup"?"Ответьте на короткие вопросы по одному шагу.":"Название, фото и цену добавите в удобном мастере."}</small></span><ChevronRight size={21}/></button>:!staff&&<button type="button" onClick={()=>revealAttachment("photo")}><span className={styles.taskIcon}><ImagePlus size={23}/></span><span><b>Добавить логотип</b><small>Загрузите логотип и настройте цвета бренда.</small></span>{brandDone?<Check size={21} className="text-emerald-600" aria-label="Готово"/>:<ChevronRight size={21}/>}</button>}
        <Link href="/admin/settings/delivery"><span className={styles.taskIcon}><Truck size={23}/></span><span><b>Настроить доставку</b><small>Укажите способы доставки, зоны и условия.</small></span>{deliveryDone?<Check size={21} className="text-emerald-600" aria-label="Готово"/>:<ChevronRight size={21}/>}</Link>
        <Link href="/store-preview" target="_blank"><span className={styles.taskIcon}><Store size={23}/></span><span><b>Посмотреть магазин</b><small>Проверьте витрину глазами покупателя.</small></span><ChevronRight size={21}/></Link>
      </div><p className={styles.disclaimer}>Предложения не публикуются без вашего решения.</p></div>:null}
      {children && <div className={styles.steps} aria-label="Действия AI Studio">{children}</div>}
      {stageHint&&turns.length>1&&<details className="text-sm"><summary className="cursor-pointer text-neutral-500">Ранние сообщения · {turns.length-1}</summary>{turns.slice(0,-1).map(turn=><article key={turn.id} className="mt-3 space-y-2"><p className="font-medium">{turn.message}</p><p>{turn.response.reply}</p></article>)}</details>}
      {(stageHint?turns.slice(-1):turns).map(turn=><article key={turn.id} className="space-y-3">
        <p className={`${styles.userMessage} ml-8 whitespace-pre-wrap break-words rounded-2xl p-4`}><span className="sr-only">Вы: </span>{turn.message}</p>
        <div className="mr-4 space-y-3 p-2"><p className="whitespace-pre-wrap break-words"><span className="sr-only">AI Studio: </span>{turn.response.reply}</p>
          {turn.response.task&&onTask&&(!designOnly||turn.response.task.intent==="store_design")&&<button type="button" className="btn btn-secondary" disabled={pending||!enabled} onClick={()=>onTask(turn.response.task!)}>{labels[turn.response.task.intent]}</button>}
          {!staff&&turn.response.help&&<Link className="btn btn-secondary" href={helpLinks[turn.response.help][0]}>{helpLinks[turn.response.help][1]} →</Link>}
          {!staff&&turn.response.help&&(turn.response.help==="payments"||turn.response.help==="integrations"||turn.response.help==="support")&&<AiRequestCard kind={turn.response.help} message={turn.message} generationId={turn.id}/>}
        </div>
      </article>)}
      {pending&&<p role="status" className={styles.thinking}>Обдумываю ваш ответ…</p>}
      {!enabled&&!working&&<p className="text-sm text-neutral-500">{staff?"Владелец разрешил только просмотр разговора.":"AI сейчас недоступен. Можно продолжить настройку вручную."}</p>}
      {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
     </div>
    </div>
    <div className={styles.composerDock}>
    {menuOpen&&<div className={styles.attachmentMenu} role="menu" aria-label="Добавить материал"><button type="button" role="menuitem" onClick={()=>revealAttachment("photo")}><ImagePlus size={18}/>Фото / логотип</button><button type="button" role="menuitem" onClick={()=>revealAttachment("file")}><FileText size={18}/>Файл PDF</button><button type="button" role="menuitem" onClick={()=>revealAttachment("camera")}><Camera size={18}/>Камера</button></div>}
    <form onSubmit={event=>{event.preventDefault();void send();}} className={styles.composer}>
      <label htmlFor="studio-conversation" className="sr-only">Сообщение AI Studio</label>
      <button type="button" className={styles.iconButton} onClick={()=>setMenuOpen(value=>!value)} aria-label={menuOpen?"Закрыть вложения":"Добавить файл"} aria-expanded={menuOpen} disabled={!onAttachment}>{menuOpen?<X size={22}/>:<Plus size={24}/>}</button>
      <textarea ref={textarea} id="studio-conversation" rows={1} value={message} maxLength={800} disabled={pending} onChange={event=>setMessage(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void send();}}} placeholder="Сообщение..."/>
      <button type="button" className={styles.iconButton} aria-label="Голосовой ввод недоступен в этом браузере" title="Голосовой ввод будет доступен после подключения" disabled><Mic size={21}/></button>
      <button type="submit" className={styles.sendButton} aria-label="Отправить сообщение" disabled={!enabled||loading||pending||message.trim().length<2}><ArrowUp size={21}/></button>
    </form>
    <div className={styles.composerOptions}><label><input type="checkbox" checked={includeBrandLogo} disabled={pending} onChange={event=>setIncludeBrandLogo(event.target.checked)}/>Учесть логотип</label>{onBanner&&<button type="button" disabled={!enabled||pending||message.trim().length<8} onClick={()=>onBanner(message.trim())}>Создать баннер по сообщению</button>}<Link href="/admin/requests?source=ai-studio">Написать в поддержку</Link><span className="sr-only">Предложения не публикуются без вашего решения</span></div>
    </div>
  </section>;
}
