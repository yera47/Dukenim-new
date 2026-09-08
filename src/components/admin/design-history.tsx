"use client";
import React,{useState} from "react";
import {useRouter} from "next/navigation";
type Entry={id:string;created_at:string;title:string|null};
export function DesignHistory() {
 const router=useRouter();const[history,setHistory]=useState<Entry[]>([]);const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");
 async function load(){setBusy(true);setMessage("");try{
  const r=await fetch("/api/ai-studio/design/history",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error);
  setHistory(d.history);if(!d.history.length)setMessage("Сохранённых изменений пока нет. История записывается с момента подключения этой функции.");
 }catch(e){setMessage(e instanceof Error?e.message:"История недоступна.");}finally{setBusy(false);}}
 async function undo(){if(!history[0]||busy)return;setBusy(true);try{
  const r=await fetch("/api/ai-studio/design/history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({historyId:history[0].id})});const d=await r.json();if(!r.ok||!d.saved)throw new Error(d.error);
  setHistory([]);setMessage("Предыдущее оформление восстановлено. Товары и заказы не изменились.");router.refresh();
 }catch(e){setMessage(e instanceof Error?e.message:"Отмена не подтверждена.");}finally{setBusy(false);}}
 return <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold">История оформления и отмена</summary>
  <p className="my-3 text-sm text-neutral-500">Отмена возвращает предыдущие цвета, обложку и тексты. На опубликованной витрине изменение будет видно покупателям.</p>
  <button type="button" disabled={busy} onClick={()=>void load()} className="btn btn-secondary">{busy?"Загружаю…":"Обновить историю"}</button>
  {history.length>0&&<><ol className="my-3 space-y-2 text-sm">{history.map(e=><li key={e.id}>{new Date(e.created_at).toLocaleString("ru-RU")} · {e.title||"Изменение оформления"}</li>)}</ol><button type="button" disabled={busy} onClick={()=>void undo()} className="btn btn-secondary">Восстановить оформление до последнего изменения</button></>}
  {message&&<p role="status" className="mt-3 text-sm">{message}</p>}
 </details>;
}
