"use client";

import {useActionState,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import {markGeneralSupportRead,sendGeneralSupportMessage} from "@/app/admin/requests/general-chat-actions";
import type {Database} from "@/types/database";

type Message=Database["public"]["Tables"]["messages"]["Row"];
const quickReplies=["Здравствуйте! Спасибо, что написали. Серик подключится и ответит вам как можно скорее.","Проверяю ваш вопрос. Пожалуйста, подождите — скоро вернусь с ответом.","Исправление готово. Пожалуйста, обновите страницу и проверьте ещё раз."];

export function GeneralSupportChat({tenantId,messages,platform=false}:{tenantId:string;messages:Message[];platform?:boolean}){
 const router=useRouter();
 const[state,action,pending]=useActionState(sendGeneralSupportMessage,{});
 const[id,setId]=useState("");const[text,setText]=useState("");const[connected,setConnected]=useState(false);
 useEffect(()=>setId(crypto.randomUUID()),[]);
 useEffect(()=>{if(state.saved){setText("");setId(crypto.randomUUID());router.refresh();}},[state,router]);
 useEffect(()=>{const mark=()=>{if(document.visibilityState==="visible")void markGeneralSupportRead(tenantId).catch(()=>{});};mark();document.addEventListener("visibilitychange",mark);return()=>document.removeEventListener("visibilitychange",mark);},[tenantId]);
 useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==="visible"&&!pending)router.refresh();},15000);return()=>clearInterval(timer);},[router,pending]);
 useEffect(()=>{const client=createClient();const channel=client.channel(`general-support:${tenantId}`).on("postgres_changes",{event:"*",schema:"public",table:"messages",filter:`tenant_id=eq.${tenantId}`},()=>{if(document.visibilityState==="visible"){void markGeneralSupportRead(tenantId).catch(()=>{});router.refresh();}}).subscribe(status=>setConnected(status==="SUBSCRIBED"));return()=>{void client.removeChannel(channel);};},[tenantId,router]);
 return <div className="space-y-4"><p className="text-xs text-slate-500">{connected?"● На связи · сообщения приходят сразу":"Обновляем переписку каждые 15 секунд"}</p>
  <div role="log" aria-label="Общий чат магазина" className="max-h-[28rem] min-h-44 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-3">{messages.length?messages.map(message=>{const mine=platform?message.from_role==="superadmin":message.from_role==="owner";return <article key={message.id} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${mine?"ml-auto bg-[#315f78] text-white":"mr-auto border border-slate-200 bg-white"}`}><p className={`text-xs ${mine?"text-sky-100/75":"text-slate-500"}`}>{message.from_role==="owner"?"Владелец магазина":"Dukenim"} · {new Date(message.created_at).toLocaleString("ru-RU")}</p><p className="mt-2 whitespace-pre-wrap break-words">{message.text}</p>{mine&&<p className="mt-2 text-right text-xs text-sky-100/80" aria-label={message.read_at?"Прочитано":"Отправлено"}>{message.read_at?"✓✓ Прочитано":"✓ Отправлено"}</p>}</article>}):<p className="py-10 text-center text-sm text-slate-500">Напишите первое сообщение.</p>}</div>
  <form action={action} className="space-y-3"><input type="hidden" name="tenantId" value={tenantId}/><input type="hidden" name="messageId" value={id}/>
   {platform&&<div className="flex flex-wrap gap-2" aria-label="Быстрые ответы">{quickReplies.map((reply,index)=><button type="button" key={reply} onClick={()=>setText(reply)} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-950">{["Приветствие","Проверяю","Исправлено"][index]}</button>)}</div>}
   <label className="block text-sm font-semibold">Сообщение<textarea name="text" value={text} onChange={event=>setText(event.target.value)} required minLength={2} maxLength={3000} disabled={pending} className="input mt-2 min-h-24 resize-y" placeholder="Напишите сообщение…"/></label>
   <button className="btn btn-primary" disabled={pending||!id||text.trim().length<2}>{pending?"Отправляю…":"Отправить"}</button>
   {state.error&&<p role="alert" className="text-sm text-red-700">{state.error}</p>}{state.saved&&<p role="status" className="text-sm text-emerald-800">Сообщение отправлено.</p>}
  </form>
 </div>;
}
