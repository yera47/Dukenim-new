"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { catalogBuilderStateSchema } from "@/lib/catalog-builder-draft";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { createCatalogAction, type CatalogActionState } from "@/app/admin/actions";
import { launchTemplatesForPlan } from "@/lib/storefront-theme";
import { nichePresets } from "@/lib/niche-presets";
import type { BusinessVertical } from "@/types/database";
import { approachForTemplate, configurationFor } from "@/lib/commerce-configurations";
import { catalogRecommendation } from "@/lib/catalog-recommendation";
import { customStoreThemeSchema, themeVariations, type CustomStoreTheme } from "@/lib/custom-store-theme";
import { contrastInk } from "@/lib/color-contrast";
import { emptyFulfilment, fulfilmentCommitSchema, type FulfilmentDraft, type paymentPreferenceSchema } from "@/lib/catalog-fulfilment";
import type { z } from "zod";
import {BrandMaterials} from "./brand-materials";

export function CatalogSetupForm({ defaultName, slug, plan, vertical = "other", fromStudio = false, aiEnabled = false, suggestedBrief = "" }: { defaultName: string; slug: string; plan: "basic" | "standard" | "pro"; vertical?: BusinessVertical; fromStudio?: boolean; aiEnabled?: boolean; suggestedBrief?:string }) {
  const [state, action, pending] = useActionState(createCatalogAction, {} as CatalogActionState);
  const templates = useMemo(() => launchTemplatesForPlan(plan), [plan]);
  const [step, setStep] = useState(0);
  const [designStage,setDesignStage]=useState<"brief"|"colors"|"examples">("brief");
  const [colorBrief,setColorBrief]=useState("");
  const [fulfilment,setFulfilment]=useState<FulfilmentDraft>(emptyFulfilment);
  const [paymentPreference,setPaymentPreference]=useState<z.infer<typeof paymentPreferenceSchema>>("later");
  const [colorTheme,setColorTheme]=useState<CustomStoreTheme>();
  const [themeChoices,setThemeChoices]=useState<ReturnType<typeof themeVariations>>([]);
  const [templateKey, setTemplateKey] = useState<string>(templates[0].key);
  const [paletteKey, setPaletteKey] = useState("mono");
  const [catalogName, setCatalogName] = useState(defaultName);
  const [brief, setBrief] = useState(suggestedBrief.slice(0,650));
  const [aiPending, setAiPending] = useState(false);
  const [brandBusy,setBrandBusy]=useState(false);
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
          setFulfilment(saved.fulfilment??emptyFulfilment);
          setPaymentPreference(saved.paymentPreference??"later");
          setColorTheme(saved.colorTheme);
          if(saved.colorTheme) setThemeChoices(themeVariations(saved.colorTheme));
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
    if (draftRevision === null || draftSaving || draftLoading || brandBusy) return;
    setDraftSaving(true); setDraftMessage("");
    try {
      const response = await fetch("/api/catalog-builder/draft", {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({revision:draftRevision,state:{step:nextStep,designStage:nextStage,fulfilment,paymentPreference,colorBrief,colorTheme,catalogName,templateKey,paletteKey,brief,generationId}})});
      const result = await response.json();
      if (!response.ok || !Number.isSafeInteger(result.revision)) throw new Error(result.error || "Сохранение не подтверждено.");
      setDraftRevision(result.revision); setDraftMessage("Черновик сохранён. Можно закрыть страницу и продолжить позже.");
      setStep(nextStep); setDesignStage(nextStage);
    } catch (error) { setDraftMessage(error instanceof Error ? error.message : "Сохранение не подтверждено. Не закрывайте страницу."); }
    finally { setDraftSaving(false); }
  }
  async function recommend() {
    if (aiPending || brandBusy || !aiEnabled || brief.trim().length < 8) return;
    setAiPending(true); setAiError(""); setAiReason("");
    try {
      const response = await fetch("/api/ai-studio/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: "store_design", brief: `${catalogName.trim()}. Цвета: ${colorBrief.trim()}. О магазине: ${brief.trim()}`.slice(0, 800) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось подобрать оформление.");
      const choice = catalogRecommendation(data.design, templates.map(template => template.key));
      if (!choice || typeof data.generationId!=="string" || !/^[0-9a-f-]{36}$/i.test(data.generationId)) throw new Error("AI предложил недоступное оформление. Выберите вариант вручную или повторите запрос.");
      setGenerationId(data.generationId); setTemplateKey(choice.templateKey); setPaletteKey(choice.paletteKey); setAiReason(choice.reason);
      const generatedTheme=customStoreThemeSchema.safeParse(data.design?.colorTheme);
      if(generatedTheme.success){setColorTheme(generatedTheme.data);setThemeChoices(themeVariations(generatedTheme.data));}
      else setAiError("AI не вернул индивидуальные цвета. Повторите запрос или задайте их вручную ниже.");
    } catch (error) { setAiError(error instanceof Error ? error.message : "AI временно недоступен. Можно выбрать оформление вручную."); }
    finally { setAiPending(false); }
  }
  async function advance() {
    if(brandBusy)return;
    setAiError("");
    if(step===2){const parsed=fulfilmentCommitSchema.safeParse(fulfilment);if(!parsed.success){setAiError(parsed.error.issues[0].message);return;}}
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
    if (aiPending || pending || draftLoading || draftSaving || brandBusy || draftRevision===null) { event.preventDefault(); return; }
    if (step < 4) {
      event.preventDefault();
      if (catalogName.trim().length >= 2) void advance();
    }
  }} className="catalog-wizard">
    <input type="hidden" name="generationId" value={generationId??""}/>
    <input type="hidden" name="colorTheme" value={colorTheme?JSON.stringify(colorTheme):""}/>
    <input type="hidden" name="fulfilment" value={JSON.stringify(fulfilment)}/>
    <input type="hidden" name="paymentPreference" value={paymentPreference}/>
    <input type="hidden" name="fromStudio" value={String(fromStudio)}/>
    <input type="hidden" name="catalogName" value={catalogName}/>
    <input type="hidden" name="templateKey" value={templateKey}/>
    <input type="hidden" name="paletteKey" value={paletteKey}/>
    <nav aria-label="Шаги создания" className="flex flex-wrap gap-3 border-b pb-4 text-sm">{["Название","Оформление","Получение","Оплата","Проверка"].slice(0,step+1).map((label,index)=>index<step?<button type="button" key={label} disabled={draftSaving||draftLoading||pending||aiPending||brandBusy} onClick={()=>void saveDraft(index)} className="text-neutral-500">✓ {index===0?catalogName:label}</button>:<span key={label} aria-current="step" className="font-bold">{index+1}. {label}</span>)}</nav>
    <p role="status" className="py-3 text-xs text-neutral-500">{draftLoading?"Загружаем сохранённые ответы…":draftSaving?"Сохраняем ответ…":draftMessage || "Ответ сохраняется при переходе к следующему шагу."}</p>
    <div className={fromStudio ? "space-y-4" : "catalog-wizard-layout"}>
      <fieldset key={step} disabled={pending || aiPending || draftLoading || draftSaving || brandBusy} className="catalog-active-step min-w-0 py-4">
        <small className="text-neutral-500">{nichePresets[vertical].label}</small>
        <h2 className="mt-3 text-2xl font-bold">{step===0?"Как называется ваш магазин?":step===1?(designStage==="brief"?"Расскажите о своём магазине":designStage==="colors"?"Какие цвета вам нравятся?":"Посмотрите, как может выглядеть ваш магазин"):step===2?"Как покупатели получат заказ?":step===3?"Как будете принимать оплату?":"Проверьте магазин перед добавлением товаров"}</h2>
        {step===1&&designStage==="brief"&&<div className="mb-6 mt-4 rounded-xl border border-neutral-200 p-4">
          <label className="block text-sm font-semibold">Что продаёте и для кого?<textarea className="input mt-2" value={brief} maxLength={650} rows={3} onChange={event=>{setBrief(event.target.value);setGenerationId(undefined);setAiReason("");}} placeholder="Например, натуральная косметика для ежедневного ухода. Небольшой ассортимент, спокойная светлая подача."/></label>
          <p className="mt-3 text-xs leading-6 text-neutral-500">Дальше обсудим цвета, затем посмотрим варианты оформления с товарами.</p>
          {aiError&&<p role="alert" className="mt-3 text-sm text-red-700">{aiError}</p>}
          {aiReason&&<p role="status" className="mt-3 text-sm leading-6">{aiReason}</p>}
        </div>}
        {step===1&&designStage==="colors"&&<div className="mt-5 space-y-4">
          <button type="button" onClick={()=>void saveDraft(1,"brief")} className="text-sm text-neutral-500">✓ О магазине · Изменить</button>
          <label className="block text-sm font-semibold">Опишите сочетание своими словами<textarea value={colorBrief} maxLength={300} rows={3} onChange={event=>{setColorBrief(event.target.value);setGenerationId(undefined);setAiReason("");setAiError("");}} className="input mt-2" placeholder="Например: нежно-розовый фон и тёмно-зелёные кнопки. Или: подберите на ваш вкус."/></label>
          <p className="text-sm text-neutral-500">AI учитывает пожелания и сохранённые правила бренда. Выберите оттенки на живых карточках ниже или задайте свои цвета вручную.</p>
          <BrandMaterials embedded onBusyChange={setBrandBusy}/>
          <div className="grid gap-3 sm:grid-cols-3">{themeChoices.map(choice=><button key={choice.name} type="button" aria-pressed={JSON.stringify(colorTheme)===JSON.stringify(choice.theme)} onClick={()=>setColorTheme(choice.theme)} className="rounded-2xl border-2 p-4 text-left" style={{background:choice.theme.background,color:contrastInk(choice.theme.background),borderColor:JSON.stringify(colorTheme)===JSON.stringify(choice.theme)?choice.theme.accent:"transparent"}}><span className="block text-xs">{choice.name}</span><strong className="my-4 block">{catalogName}</strong><span className="block rounded-xl p-3 text-sm" style={{background:choice.theme.surface}}>Ваш каталог</span><span className="mt-3 block rounded-lg p-2 text-center text-xs" style={{background:choice.theme.accent,color:contrastInk(choice.theme.accent)}}>Смотреть товары →</span></button>)}</div>
          <details><summary className="cursor-pointer text-sm">Указать цвета вручную</summary><div className="mt-3 flex flex-wrap gap-4">{([['background','Фон'],['surface','Карточки'],['accent','Кнопки']] as const).map(([key,label])=><label key={key} className="text-sm">{label}<input aria-label={label} type="color" className="mt-2 block h-10 w-20" value={colorTheme?.[key]??(key==='accent'?'#171717':'#ffffff')} onChange={event=>{const next={background:'#ffffff',surface:'#ffffff',accent:'#171717',...colorTheme,[key]:event.target.value};if(key==='background'&&contrastInk(next.background)!==contrastInk(next.surface))next.surface=next.background;if(customStoreThemeSchema.safeParse(next).success){setColorTheme(next);setAiError('');}else setAiError('Сделайте фон и карточки одинаково светлыми или тёмными — так текст останется читаемым.');}}/></label>)}</div></details>
          <button type="button" disabled={!aiEnabled||aiPending||colorBrief.trim().length<3} onClick={()=>void recommend()} className="btn btn-secondary">{aiPending?"Подбираю оформление…":"Предложить оформление с AI"}</button>
          {!aiEnabled&&<p className="text-sm text-neutral-500">AI в этой среде не подключён. Пожелания сохранятся; дальше можно посмотреть примеры.</p>}
          {aiError&&<p role="alert" className="text-sm text-red-700">{aiError}</p>}
          {aiReason&&<p role="status" className="text-sm">{aiReason}</p>}
        </div>}

        {step===0&&<><p className="my-4 text-sm leading-7 text-neutral-500">Это название увидят покупатели. Его можно изменить позже.</p><label className="block text-sm font-semibold">Название<input value={catalogName} maxLength={80} onChange={event=>{setCatalogName(event.target.value);setGenerationId(undefined);setAiReason("");}} className="input mt-2" placeholder="Например, Серик Шоп"/></label><p className="mt-4 break-all text-xs text-neutral-500">dukenim.kz/s/{slug}</p></>}
        {step===1&&designStage==="examples"&&<>
          <p className="my-4 text-sm leading-7 text-neutral-500">Это наполненные иллюстрации. Ваши товары добавим позже. Выберите подходящую подачу — цвета можно изменить после.</p>
          <button type="button" onClick={()=>void saveDraft(1,"brief")} className="mb-5 text-sm underline underline-offset-4">✓ О магазине: {brief.slice(0,70)} · Изменить</button>
          <div className="grid gap-5 lg:grid-cols-3">{templates.map(option=>{const config=configurationFor(vertical,approachForTemplate(option.key));return <article key={option.key} className={`overflow-hidden rounded-2xl border-2 bg-white p-3 text-left ${option.key===templateKey?"border-neutral-900":"border-neutral-200"}`}>
            <div className="px-1 pb-4"><h3 className="text-base font-semibold">{config?.title??option.benefit}</h3><p className="mt-2 text-sm leading-6 text-neutral-500">{config?.description??option.benefit}</p></div>
            <iframe loading="lazy" title={`Пример: ${config?.title??option.key}`} className="h-[420px] w-full rounded-lg border border-neutral-100" src={`/store-preview?${new URLSearchParams({name:catalogName,template:option.key,palette:paletteKey,...(colorTheme?{colors:JSON.stringify(colorTheme)}:{}),content:"example"})}`}/>
            {config&&<a href={config.href} target="_blank" rel="noopener noreferrer" className="my-3 block text-center text-sm underline">Открыть полный пример ↗</a>}
            <button type="button" aria-pressed={option.key===templateKey} onClick={()=>{setTemplateKey(option.key);}} className="btn btn-secondary mt-2 w-full">{option.key===templateKey?"✓ Выбрано":"Выбрать"}</button>
          </article>})}</div>
        </>}
        {step===4&&<><p className="my-4 text-sm leading-7 text-neutral-500">Сохраним «{catalogName}» с выбранным оформлением. Следующий шаг — фотография, цена и варианты вашего первого товара.</p><p className="text-xs leading-6 text-neutral-500">Ниже — выбранное оформление с примерами товаров. Они не добавятся в ваш магазин. Вкладка «Мои товары» показывает только ваши данные.</p></>}
        {step===2&&<div className="mt-5 space-y-5">
          <p className="text-sm text-neutral-500">Выберите доступные способы. Условия сохранятся в магазине; позже их можно изменить в настройках.</p>
          <label className="flex items-center gap-3 rounded-xl border p-4"><input type="checkbox" checked={fulfilment.delivery} onChange={e=>setFulfilment({...fulfilment,delivery:e.target.checked})}/>Доставка покупателю</label>
          {fulfilment.delivery&&<div className="grid gap-4 sm:grid-cols-2">{([['zone','Куда доставляете','Например, Алматы в пределах города'],['cost','Стоимость, ₸','Например, 1500'],['eta','Срок доставки','Например, на следующий день']] as const).map(([key,label,placeholder])=><label key={key} className="text-sm">{label}<input className="input mt-2" value={fulfilment[key]} inputMode={key==='cost'?'numeric':'text'} maxLength={key==='cost'?10:key==='zone'?100:200} placeholder={placeholder} onChange={e=>setFulfilment({...fulfilment,[key]:e.target.value})}/></label>)}</div>}
          <label className="flex items-center gap-3 rounded-xl border p-4"><input type="checkbox" checked={fulfilment.pickup} onChange={e=>setFulfilment({...fulfilment,pickup:e.target.checked})}/>Самовывоз из магазина</label>
          <label className="flex items-center gap-3 rounded-xl border p-4"><input type="checkbox" checked={fulfilment.reservation} onChange={e=>setFulfilment({...fulfilment,reservation:e.target.checked})}/>Бронь в магазине без онлайн-оплаты</label>
          {fulfilment.reservation&&<label className="block text-sm">Сколько часов держать товар (1–72)<input type="number" min={1} max={72} className="input mt-2" value={fulfilment.holdHours} onChange={e=>setFulfilment({...fulfilment,holdHours:Number(e.target.value)})}/><span className="mt-2 block text-neutral-500">Бронь временно уменьшает доступный остаток. После срока товар возвращается в продажу.</span></label>}
          {(fulfilment.pickup||fulfilment.reservation)&&<div className="grid gap-4 sm:grid-cols-2">{([['address','Адрес','Город, улица, дом'],['hours','Часы работы','Например, ежедневно 10:00–20:00'],['preparation','Когда заказ будет готов','Например, через 2 часа после подтверждения'],['gisUrl','Ссылка на 2ГИС · необязательно','https://2gis.kz/…'],['yandexUrl','Яндекс Карты · необязательно','https://yandex.kz/maps/…']] as const).map(([key,label,placeholder])=><label key={key} className="text-sm">{label}<input className="input mt-2" value={fulfilment[key]} maxLength={key.endsWith('Url')?1500:key==='address'?300:200} placeholder={placeholder} onChange={e=>setFulfilment({...fulfilment,[key]:e.target.value})}/></label>)}</div>}
          <p className="text-xs leading-5 text-neutral-500">Пока онлайн-оплата не подключена, не обещаем предоплаченный самовывоз. Выбранная бронь станет доступна после сохранения условий и публикации магазина.</p>
        </div>}
        {step===3&&<div className="mt-5 space-y-3">
          <p className="mb-4 text-sm text-neutral-500">Можно продолжить без онлайн-оплаты. Выбор провайдера не подключает платёж сам: для этого нужны аккаунт бизнеса и проверка интеграции.</p>
          {([['later','Подключу онлайн-оплату позже','Продолжить создание магазина. Не показываем покупателю неработающую оплату.'],['freedompay','Карты через FreedomPay','Кандидат для подключения: сумма заказа, платёжная страница и подтверждение серверу.'],['halyk','Карты через Halyk ePay','Если ваш бизнес подключает эквайринг Halyk. Нужны реквизиты доступа от банка.'],['kaspi','Kaspi Pay','Обсудить официальную интеграцию. Обычная ссылка не подставляет сумму автоматически.']] as const).map(([value,label,description])=><label key={value} className={`flex gap-3 rounded-2xl border p-4 ${paymentPreference===value?'border-neutral-900 bg-white':'border-neutral-200'}`}><input type="radio" name="payment-choice" value={value} checked={paymentPreference===value} onChange={()=>setPaymentPreference(value)}/><span><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs leading-5 text-neutral-500">{description}</span></span></label>)}
        </div>}
        {step===4&&<dl className="mt-5 space-y-2 rounded-xl border p-4 text-sm"><div><dt className="text-neutral-500">Получение</dt><dd>{fulfilment.delivery?`Доставка: ${fulfilment.zone}, ${fulfilment.cost} ₸, ${fulfilment.eta}`:''}{fulfilment.pickup?<p>Самовывоз: {fulfilment.address}, {fulfilment.hours}</p>:null}{fulfilment.reservation?<p>Бронь: {fulfilment.address}, {fulfilment.holdHours} ч.</p>:null}</dd></div><div><dt className="text-neutral-500">Онлайн-оплата</dt><dd>{paymentPreference==='later'?'Подключить позже':`${paymentPreference} — ещё не подключено`}</dd></div></dl>}
        {step>=2&&aiError&&<p role="alert" className="mt-4 text-sm text-red-700">{aiError}</p>}
        {state.error&&<p role="alert" className="mt-4 text-sm text-red-700">{state.error}</p>}
        <div className="mt-8 flex gap-3">{step>0&&<button type="button" disabled={pending||draftRevision===null} className="btn btn-secondary" onClick={()=>void (step===1&&designStage!=="brief"?saveDraft(1,designStage==="examples"?"colors":"brief"):saveDraft(step-1))}>Назад</button>}{step<4?<button type="button" disabled={catalogName.trim().length<2||draftRevision===null} className="btn btn-primary" onClick={()=>void advance()}>{step===1&&designStage==="brief"?"Перейти к цветам":step===1&&designStage==="colors"?"Показать примеры":"Продолжить"} <ArrowRight size={16}/></button>:<button disabled={pending||draftRevision===null||catalogName.trim().length<2} className="btn btn-primary">{pending?<><LoaderCircle size={16} className="animate-spin"/>Сохраняем…</>:"Сохранить и добавить товар"}</button>}</div>
      </fieldset>
      {step===4&&<section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white" aria-label="Проверка оформления">
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-3">
          {(["example","own"] as const).map(mode=><button key={mode} type="button" aria-pressed={previewContent===mode} onClick={()=>setPreviewContent(mode)} className={`rounded-lg px-4 py-2 text-sm ${previewContent===mode?"bg-neutral-900 text-white":"bg-neutral-100"}`}>{mode==="example"?"Пример с товарами":"Мои товары"}</button>)}
        </div>
        <iframe title={previewContent==="example"?"Пример выбранного оформления с демонстрационными товарами":"Ваш каталог с реальными товарами"} className="h-[640px] w-full border-0" src={`/store-preview?${new URLSearchParams({name:catalogName,template:templateKey,palette:paletteKey,...(colorTheme?{colors:JSON.stringify(colorTheme)}:{}),content:previewContent,...(generationId?{generation:generationId}:{})})}`}/>
      </section>}
    </div>
    <button type="button" className="mt-4 text-xs text-neutral-500 underline underline-offset-4" disabled={draftLoading||draftSaving||aiPending||pending||brandBusy||draftRevision===null} onClick={()=>void saveDraft()}>Сохранить текущий ответ и продолжить позже</button>
  </form>;
}
