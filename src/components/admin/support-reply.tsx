"use client";
import React,{useActionState,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {sendThreadMessage} from "@/app/admin/requests/thread-actions";
export function SupportReply({requestId}:{requestId:string}) {
 const router=useRouter();const[state,action,pending]=useActionState(sendThreadMessage,{});
 const[id,setId]=useState("");const[text,setText]=useState("");
 useEffect(()=>{setId(crypto.randomUUID());},[]);
 useEffect(()=>{if(state.saved){setText("");setId(crypto.randomUUID());router.refresh();}},[state,router]);
 useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==="visible"&&!pending)router.refresh();},15000);return()=>clearInterval(timer);},[router,pending]);
 return <form action={action} className="mt-5 space-y-3"><input type="hidden" name="requestId" value={requestId}/><input type="hidden" name="messageId" value={id}/>
 <label className="block text-sm font-semibold">Сообщение<textarea name="text" value={text} onChange={e=>setText(e.target.value)} required minLength={2} maxLength={3000} disabled={pending} className="input mt-2 min-h-28" placeholder="Напишите ответ. Пароли и коды подтверждения не нужны."/></label>
 <button disabled={pending||!id||text.trim().length<2} className="btn btn-primary">{pending?"Отправляю…":"Отправить"}</button>
 {state.error&&<p role="alert">{state.error}</p>}{state.saved&&<p role="status" className="text-sm">Сообщение отправлено.</p>}</form>;
}
