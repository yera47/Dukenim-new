"use client";
import React,{useActionState,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {sendThreadMessage} from "@/app/admin/requests/thread-actions";
import {markSupportThreadRead} from "@/app/admin/requests/read-action";
import {createClient} from "@/lib/supabase/client";
const quickReplies=["Здравствуйте! Спасибо, что написали. Серик подключится и ответит вам как можно скорее.","Проверяю ваш вопрос. Пожалуйста, подождите — скоро вернусь с ответом.","Исправление готово. Пожалуйста, обновите страницу и проверьте ещё раз."];
export function SupportReply({requestId,platform=false}:{requestId:string;platform?:boolean}) {
 const router=useRouter();const[state,action,pending]=useActionState(sendThreadMessage,{});
 const[id,setId]=useState("");const[text,setText]=useState("");
 useEffect(()=>{setId(crypto.randomUUID());},[]);
 useEffect(()=>{if(state.saved){setText("");setId(crypto.randomUUID());router.refresh();}},[state,router]);
 useEffect(()=>{const mark=()=>{if(document.visibilityState==="visible")void markSupportThreadRead(requestId).catch(()=>{});};mark();document.addEventListener("visibilitychange",mark);return()=>document.removeEventListener("visibilitychange",mark);},[requestId]);
 useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==="visible"&&!pending)router.refresh();},15000);return()=>clearInterval(timer);},[router,pending]);
 useEffect(()=>{const client=createClient();const channel=client.channel(`support:${requestId}`).on("postgres_changes",{event:"*",schema:"public",table:"messages",filter:`request_id=eq.${requestId}`},()=>{if(document.visibilityState==="visible"){void markSupportThreadRead(requestId).catch(()=>{});router.refresh();}}).subscribe();return()=>{void client.removeChannel(channel);};},[requestId,router]);
 return <form action={action} className="mt-5 space-y-3"><input type="hidden" name="requestId" value={requestId}/><input type="hidden" name="messageId" value={id}/>
 {platform&&<div className="flex flex-wrap gap-2" aria-label="Быстрые ответы">{quickReplies.map((reply,index)=><button type="button" key={reply} onClick={()=>setText(reply)} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-950">{["Приветствие","Проверяю","Исправлено"][index]}</button>)}</div>}
 <label className="block text-sm font-semibold">Сообщение<textarea name="text" value={text} onChange={e=>setText(e.target.value)} required minLength={2} maxLength={3000} disabled={pending} className="input mt-2 min-h-28" placeholder="Напишите ответ. Пароли и коды подтверждения не нужны."/></label>
 <button disabled={pending||!id||text.trim().length<2} className="btn btn-primary">{pending?"Отправляю…":"Отправить"}</button>
 {state.error&&<p role="alert">{state.error}</p>}{state.saved&&<p role="status" className="text-sm">Сообщение отправлено.</p>}</form>;
}
