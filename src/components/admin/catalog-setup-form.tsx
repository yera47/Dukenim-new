"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { catalogBuilderStateSchema } from "@/lib/catalog-builder-draft";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { createCatalogAction, type CatalogActionState } from "@/app/admin/actions";
import { launchTemplatesForPlan } from "@/lib/storefront-theme";
import { launchCopyForVertical, nichePresets } from "@/lib/niche-presets";
import type { BusinessVertical } from "@/types/database";
import { TemplateIllustration } from "./template-illustration";
import { catalogRecommendation } from "@/lib/catalog-recommendation";

export function CatalogSetupForm({ defaultName, slug, plan, vertical = "other", fromStudio = false, aiEnabled = false, suggestedBrief = "" }: { defaultName: string; slug: string; plan: "basic" | "standard" | "pro"; vertical?: BusinessVertical; fromStudio?: boolean; aiEnabled?: boolean; suggestedBrief?:string }) {
  const [state, action, pending] = useActionState(createCatalogAction, {} as CatalogActionState);
  const templates = useMemo(() => launchTemplatesForPlan(plan), [plan]);
  const [step, setStep] = useState(0);
  const [designStage,setDesignStage]=useState<"brief"|"colors"|"examples">("brief");
  const [colorBrief,setColorBrief]=useState("");
  const [templateKey, setTemplateKey] = useState<string>(templates[0].key);
  const [paletteKey, setPaletteKey] = useState("mono");
  const [catalogName, setCatalogName] = useState(defaultName);
  const [brief, setBrief] = useState(suggestedBrief.slice(0,650));
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiReason, setAiReason] = useState("");
  const [generationId,setGenerationId]=useState<string|undefined>();
  const [draftLoading, setDraftLoading] = useState(true);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [previewContent,setPreviewContent]=useState<"example"|"own">("example");
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/catalog-builder/draft", {cache:"no-store",signal:controller.signal});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Не удалось прочитать черновик.");
        if (result.draft) {
          const parsed = catalogBuilderStateSchema.safeParse(result.draft.state);
          if (!parsed.success || !Number.isSafeInteger(result.draft.revision) || result.draft.revision < 1) throw new Error("Сохранённый черновик требует проверки. Новые изменения его не перезапишут.");
          const saved = parsed.data;
          setDesignStage(saved.designStage ?? "brief");
          setColorBrief(saved.colorBrief ?? "");
          setGenerationId(saved.generationId); setCatalogName(saved.catalogName); setBrief(previous => previous || saved.brief); setPaletteKey(saved.paletteKey); setStep(saved.step);
          if (templates.some(t=>t.key===saved.templateKey)) setTemplateKey(saved.templateKey);
          else setStep(1);
          setDraftRevision(result.draft.revision);
          setDraftMessage("Продолжаем сохранённый черновик. Он ещё не опубликован.");
        } else setDraftRevision(0);
      } catch (error) {
        if (!controller.signal.aborted) setDraftMessage(error instanceof Error ? error.message : "Не удалось загрузить черновик.");
      } finally { if (!controller.signal.aborted) setDraftLoading(false); }
    })();
    return () => controller.abort();
  }, [templates]);
  useEffect(() => { if(suggestedBrief) { setBrief(suggestedBrief.slice(0,650)); setGenerationId(undefined); setAiReason(""); } }, [suggestedBrief]);
  async function saveDraft(nextStep = step, nextStage = designStage) {
    if (draftRevision === null || draftSaving || draftLoading) return;
    setDraftSaving(true); setDraftMessage("");
    try {
      const response = await fetch("/api/catalog-builder/draft", {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({revision:draftRevision,state:{step:nextStep,designStage:nextStage,colorBrief,catalogName,templateKey,paletteKey,brief,generationId}})});
      const result = await response.json();
      if (!response.ok || !Number.isSafeInteger(result.revision)) throw new Error(result.error || "Сохранение не подтверждено.");
      setDraftRevision(result.revision); setDraftMessage("Черновик сохранён. Можно закрыть страницу и продолжить позже.");
      setStep(nextStep); setDesignStage(nextStage);
    } catch (error) { setDraftMessage(error instanceof Error ? error.message : "Сохранение не подтверждено. Не закрывайте страницу."); }
    finally { setDraftSaving(false); }
  }
  async function recommend() {
    if (aiPending || !aiEnabled || brief.trim().length < 8) return;
    setAiPending(true); setAiError(""); setAiReason("");
    try {
      const response = await fetch("/api/ai-studio/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: "store_design", brief: `${catalogName.trim()}. Цвета: ${colorBrief.trim()}. О магазине: ${brief.trim()}`.slice(0, 800) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось подобрать оформление.");
      const choice = catalogRecommendation(data.design, templates.map(template => template.key));
      if (!choice || typeof data.generationId!=="string" || !/^[0-9a-f-]{36}$/i.test(data.generationId)) throw new Error("AI предложил недоступное оформление. Выберите вариант вручную или повторите запрос.");
      setGenerationId(data.generationId); setTemplateKey(choice.templateKey); setPaletteKey(choice.paletteKey); setAiReason(choice.reason);
    } catch (error) { setAiError(error instanceof Error ? error.message : "AI временно недоступен. Можно выбрать оформление вручную."); }
    finally { setAiPending(false); }
  }
  async function advance() {
    if (step===1 && designStage==="brief") {
      if (brief.trim().length < 8) { setAiError("Расскажите хотя бы коротко, что продаёте и кому."); return; }
      await saveDraft(1,"colors");
      return;
    }
    if (step===1 && designStage==="colors") {
      if (colorBrief.trim().length < 3) { setAiError("Опишите желаемые цвета или напишите «На ваш вкус»."); return; }
      await saveDraft(1,"examples");
      return;
    }
    await saveDraft(step+1);
  }
  return <form action={action} onSubmit={event => {
    if (aiPending || pending || draftLoading || draftSaving || draftRevision===null) { event.preventDefault(); return; }
    if (step < 2) {
      event.preventDefault();
      if (catalogName.trim().length >= 2) void advance();
    }
  }} className="catalog-wizard">
    <input type="hidden" name="generationId" value={generationId??""}/>
    <input type="hidden" name="fromStudio" value={String(fromStudio)}/>
    <input type="hidden" name="catalogName" value={catalogName}/>
    <input type="hidden" name="templateKey" value={templateKey}/>
    <input type="hidden" name="paletteKey" value={paletteKey}/>
    <nav aria-label="Шаги создания" className="flex flex-wrap gap-3 border-b pb-4 text-sm">{["Название","Оформление","Проверка"].slice(0,step+1).map((label,index)=>index<step?<button type="button" key={label} disabled={draftSaving||draftLoading||pending||aiPending} onClick={()=>void saveDraft(index)} className="text-neutral-500">✓ {index===0?catalogName:label}</button>:<span key={label} aria-current="step" className="font-bold">{index+1}. {label}</span>)}</nav>
    <p role="status" className="py-3 text-xs text-neutral-500">{draftLoading?"Загружаем сохранённые ответы…":draftSaving?"Сохраняем ответ…":draftMessage || "Ответ сохраняется при переходе к следующему шагу."}</p>
    <div className={fromStudio ? "space-y-4" : "catalog-wizard-layout"}>
      <fieldset key={step} disabled={pending || aiPending || draftLoading || draftSaving} className="catalog-active-step min-w-0 py-4">
        <small className="text-neutral-500">{nichePresets[vertical].label}</small>
        <h2 className="mt-3 text-2xl font-bold">{step===0?"Как называется ваш магазин?":step===1?(designStage==="brief"?"Расскажите о своём магазине":designStage==="colors"?"Какие цвета вам нравятся?":"Посмотрите, как может выглядеть ваш магазин"):"Теперь добавим первый товар."}</h2>
        {step===1&&designStage==="brief"&&<div className="mb-6 mt-4 rounded-xl border border-neutral-200 p-4">
          <label className="block text-sm font-semibold">Что продаёте и для кого?<textarea className="input mt-2" value={brief} maxLength={650} rows={3} onChange={event=>{setBrief(event.target.value);setGenerationId(undefined);setAiReason("");}} placeholder="Например, натуральная косметика для ежедневного ухода. Небольшой ассортимент, спокойная светлая подача."/></label>
          <p className="mt-3 text-xs leading-6 text-neutral-500">Дальше обсудим цвета, затем посмотрим варианты оформления с товарами.</p>
          {aiError&&<p role="alert" className="mt-3 text-sm text-red-700">{aiError}</p>}
          {aiReason&&<p role="status" className="mt-3 text-sm leading-6">{aiReason}</p>}
        </div>}
        {step===1&&designStage==="colors"&&<div className="mt-5 space-y-4">
          <button type="button" onClick={()=>void saveDraft(1,"brief")} className="text-sm text-neutral-500">✓ О магазине · Изменить</button>
          <label className="block text-sm font-semibold">Опишите сочетание своими словами<textarea value={colorBrief} maxLength={300} rows={3} onChange={event=>{setColorBrief(event.target.value);setGenerationId(undefined);setAiReason("");setAiError("");}} className="input mt-2" placeholder="Например: нежно-розовый фон и тёмно-зелёные кнопки. Или: подберите на ваш вкус."/></label>
          <p className="text-sm text-neutral-500">Сохранённые правила бренда также учитываются. Сейчас AI подбирает ближайшее оформление и акцент; произвольные сочетания фона и кнопок ещё не поддерживаются.</p>
          <button type="button" disabled={!aiEnabled||aiPending||colorBrief.trim().length<3} onClick={()=>void recommend()} className="btn btn-secondary">{aiPending?"Подбираю оформление…":"Предложить оформление с AI"}</button>
          {!aiEnabled&&<p className="text-sm text-neutral-500">AI в этой среде не подключён. Пожелания сохранятся; дальше можно посмотреть примеры.</p>}
          {aiError&&<p role="alert" className="text-sm text-red-700">{aiError}</p>}
          {aiReason&&<p role="status" className="text-sm">{aiReason}</p>}
        </div>}

        {step===0&&<><p className="my-4 text-sm leading-7 text-neutral-500">Это название увидят покупатели. Его можно изменить позже.</p><label className="block text-sm font-semibold">Название<input value={catalogName} maxLength={80} onChange={event=>{setCatalogName(event.target.value);setGenerationId(undefined);setAiReason("");}} className="input mt-2" placeholder="Например, Серик Шоп"/></label><p className="mt-4 break-all text-xs text-neutral-500">dukenim.kz/s/{slug}</p></>}
        {step===1&&designStage==="examples"&&<>
          <p className="my-4 text-sm leading-7 text-neutral-500">Это наполненные иллюстрации. Ваши товары добавим позже. Выберите подходящую подачу — цвета можно изменить после.</p>
          <button type="button" onClick={()=>void saveDraft(1,"brief")} className="mb-5 text-sm underline underline-offset-4">✓ О магазине: {brief.slice(0,70)} · Изменить</button>
          <div className="grid gap-5 lg:grid-cols-2">{templates.map((option,index)=>{const [title,text]=launchCopyForVertical(vertical,index);return <button type="button" key={option.key} aria-pressed={option.key===templateKey} onClick={()=>{setGenerationId(undefined);setTemplateKey(option.key);}} className={`overflow-hidden rounded-2xl border-2 p-3 text-left ${option.key===templateKey?"border-neutral-900":"border-transparent bg-white"}`}>
            <div className="px-1 pb-4"><b className="text-base">{title}</b><p className="mt-2 text-sm leading-6 text-neutral-500">{text}</p><span className="mt-2 block text-xs">{index===0?"Подходит для небольшой выразительной коллекции":"Подходит, когда важно быстро найти нужный товар"}</span></div>
            <TemplateIllustration vertical={vertical} compact={index===1}/><span className="mt-3 block text-center text-sm font-semibold">{option.key===templateKey?"✓ Выбрано":"Выбрать этот вариант"}</span>
          </button>})}</div>
        </>}
        {step===2&&<><p className="my-4 text-sm leading-7 text-neutral-500">Сохраним «{catalogName}» с выбранным оформлением. Следующий шаг — фотография, цена и варианты вашего первого товара.</p><p className="text-xs leading-6 text-neutral-500">Ниже — выбранное оформление с примерами товаров. Они не добавятся в ваш магазин. Вкладка «Мои товары» показывает только ваши данные.</p></>}
        {state.error&&<p role="alert" className="mt-4 text-sm text-red-700">{state.error}</p>}
        <div className="mt-8 flex gap-3">{step>0&&<button type="button" disabled={pending||draftRevision===null} className="btn btn-secondary" onClick={()=>void (step===1&&designStage!=="brief"?saveDraft(1,designStage==="examples"?"colors":"brief"):saveDraft(step-1))}>Назад</button>}{step<2?<button type="button" disabled={catalogName.trim().length<2||draftRevision===null} className="btn btn-primary" onClick={()=>void advance()}>{step===1&&designStage==="brief"?"Перейти к цветам":step===1&&designStage==="colors"?"Показать примеры":"Продолжить"} <ArrowRight size={16}/></button>:<button disabled={pending||draftRevision===null||catalogName.trim().length<2} className="btn btn-primary">{pending?<><LoaderCircle size={16} className="animate-spin"/>Сохраняем…</>:"Сохранить и добавить товар"}</button>}</div>
      </fieldset>
      {step===2&&<section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white" aria-label="Проверка оформления">
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-3">
          {(["example","own"] as const).map(mode=><button key={mode} type="button" aria-pressed={previewContent===mode} onClick={()=>setPreviewContent(mode)} className={`rounded-lg px-4 py-2 text-sm ${previewContent===mode?"bg-neutral-900 text-white":"bg-neutral-100"}`}>{mode==="example"?"Пример с товарами":"Мои товары"}</button>)}
        </div>
        <iframe title={previewContent==="example"?"Пример выбранного оформления с демонстрационными товарами":"Ваш каталог с реальными товарами"} className="h-[640px] w-full border-0" src={`/store-preview?${new URLSearchParams({name:catalogName,template:templateKey,palette:paletteKey,content:previewContent,...(generationId?{generation:generationId}:{})})}`}/>
      </section>}
    </div>
    <button type="button" className="mt-4 text-xs text-neutral-500 underline underline-offset-4" disabled={draftLoading||draftSaving||aiPending||pending||draftRevision===null} onClick={()=>void saveDraft()}>Сохранить текущий ответ и продолжить позже</button>
  </form>;
}
