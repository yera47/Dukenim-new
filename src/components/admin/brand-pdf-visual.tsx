"use client";
import React,{useEffect,useState} from "react";
import {renderBrandbookPage} from "@/lib/pdf-brandbook-visual";

export function BrandPdfVisual({file,onRules,onBusyChange}:{file:File;onRules:(rules:string)=>void;onBusyChange:(busy:boolean)=>void}){
  const [page,setPage]=useState(1);const[prepared,setPrepared]=useState<{image:string;page:number;pages:number}|null>(null);
  const[busy,setBusy]=useState(false);const[result,setResult]=useState("");const[error,setError]=useState("");
  useEffect(()=>{onBusyChange(busy);return()=>onBusyChange(false);},[busy,onBusyChange]);
  async function prepare(){if(busy)return;setBusy(true);setError("");setResult("");setPrepared(null);try{const rendered=await renderBrandbookPage(file,page);setPrepared({...rendered,page});}catch(e){setError(e instanceof Error?e.message:"Не удалось показать страницу.");}finally{setBusy(false);}}
  async function analyze(){if(!prepared||busy)return;setBusy(true);setError("");setResult("");try{
    const response=await fetch("/api/ai-studio/draft",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({intent:"consultation",brief:`Проанализируй только страницу ${prepared.page} из ${prepared.pages} моего брендбука. Кратко опиши видимые цвета, характер типографики и композицию, рекомендации для витрины. Не выдумывай название шрифта. Это не весь брендбук. Пока без task и без изменений магазина.`,brandPage:prepared.image})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||"Анализ не выполнен.");
    if(typeof data.consultation?.reply!=="string"||!data.generationId)throw new Error("Ответ не подтверждён.");
    setResult(data.consultation.reply);
  }catch(e){setError(e instanceof Error?e.message:"Анализ не выполнен.");}finally{setBusy(false);}}
  return <section className="space-y-3 rounded-xl border p-3" aria-label="Визуальный анализ PDF">
    <strong className="text-sm">Посмотреть страницу вместе с AI</strong>
    <p className="text-xs leading-5 text-neutral-500">Выберите страницу с логотипом, цветами или примерами. Сначала покажем её здесь. Только после нажатия «Отправить страницу AI» изображение уйдёт модели Azure; исходный PDF не отправляется. Анализ расходует доступный лимит AI Studio.</p>
    <label className="block text-sm">Номер страницы<input type="number" min={1} max={40} value={page} disabled={busy} onChange={e=>{setPage(Number(e.target.value));setPrepared(null);setResult("");}} className="input mt-2 max-w-24"/></label>
    <button type="button" disabled={busy} onClick={()=>void prepare()} className="btn btn-secondary">Подготовить страницу</button>
    {prepared&&<><p className="text-xs">Страница {prepared.page} из {prepared.pages}</p>
      {/* Local, bounded data URL; it must not be sent to an image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={prepared.image} alt={`Страница ${prepared.page} перед отправкой AI`} className="max-h-80 max-w-full rounded-lg border object-contain"/>
      <button type="button" disabled={busy} onClick={()=>void analyze()} className="btn btn-secondary">Отправить страницу AI</button></>}
    {busy&&<p role="status" className="text-sm">Обрабатываем страницу…</p>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {result&&<><textarea aria-label="Проверить визуальные правила" value={result} maxLength={1800} onChange={e=>setResult(e.target.value)} rows={5} className="input w-full"/><button type="button" disabled={busy} onClick={()=>onRules(`Визуальные рекомендации по странице ${prepared?.page}:\n${result}`)} className="btn btn-secondary">Добавить проверенные рекомендации</button><p className="text-xs text-neutral-500">Проверьте вывод. Для следующих шагов сохраните материалы бренда кнопкой ниже. Другие страницы ещё не анализировались.</p></>}
  </section>;
}
