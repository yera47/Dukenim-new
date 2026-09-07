"use client";

import { useActionState, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { createCatalogAction, type CatalogActionState } from "@/app/admin/actions";
import { launchTemplatesForPlan, palettes, paletteByKey } from "@/lib/storefront-theme";
import { NichePreview } from "@/components/store/niche-preview";
import { launchCopyForVertical, nichePresets } from "@/lib/niche-presets";
import type { BusinessVertical } from "@/types/database";

export function CatalogSetupForm({ defaultName, slug, plan, vertical = "other", fromStudio = false }: { defaultName: string; slug: string; plan: "basic" | "standard" | "pro"; vertical?: BusinessVertical; fromStudio?: boolean }) {
  const [state, action, pending] = useActionState(createCatalogAction, {} as CatalogActionState);
  const templates = launchTemplatesForPlan(plan);
  const [step, setStep] = useState(0);
  const [templateKey, setTemplateKey] = useState<string>(templates[0].key);
  const [paletteKey, setPaletteKey] = useState("paper-forest");
  const [catalogName, setCatalogName] = useState(defaultName);
  const palette = paletteByKey(paletteKey);
  return <form action={action} onSubmit={event => {
    if (step < 2) {
      event.preventDefault();
      if (catalogName.trim().length >= 2) setStep(step + 1);
    }
  }} className="catalog-wizard">
    <input type="hidden" name="fromStudio" value={String(fromStudio)}/>
    <input type="hidden" name="catalogName" value={catalogName}/>
    <input type="hidden" name="templateKey" value={templateKey}/>
    <input type="hidden" name="paletteKey" value={paletteKey}/>
    <nav aria-label="Шаги создания" className="flex gap-4 border-b pb-4 text-sm">{["Название","Оформление","Проверка"].map((label,index)=><span key={label} aria-current={step===index?"step":undefined} className={step===index?"font-bold":"text-neutral-400"}>{index+1}. {label}</span>)}</nav>
    <div className="catalog-wizard-layout">
      <section className="py-4">
        <small className="text-neutral-500">{nichePresets[vertical].label}</small>
        <h2 className="mt-3 text-2xl font-bold">{step===0?"Как называется ваш магазин?":step===1?"Выберите подачу товаров":"Теперь добавим первый товар."}</h2>
        {step===0&&<><p className="my-4 text-sm leading-7 text-neutral-500">Это название увидят покупатели. Его можно изменить позже.</p><label className="block text-sm font-semibold">Название<input value={catalogName} maxLength={80} onChange={event=>setCatalogName(event.target.value)} className="input mt-2" placeholder="Например, Aru Store"/></label><p className="mt-4 break-all text-xs text-neutral-500">dukenim.kz/s/{slug}</p></>}
        {step===1&&<><p className="my-4 text-sm leading-7 text-neutral-500">Сравните варианты в предпросмотре. Ваши товары и адрес сохранятся при смене оформления.</p><div className="grid gap-3">{templates.map((option,index)=>{const [title,text]=launchCopyForVertical(vertical,index);return <button type="button" key={option.key} aria-pressed={option.key===templateKey} onClick={()=>setTemplateKey(option.key)} className={`rounded-xl border p-4 text-left ${option.key===templateKey?"border-black bg-neutral-100":"border-neutral-200"}`}><b>{title}</b><span className="mt-2 block text-sm text-neutral-500">{text}</span></button>})}</div><details className="mt-5"><summary className="cursor-pointer text-sm font-semibold">Настроить цвета</summary><div className="mt-3 grid grid-cols-3 gap-2">{palettes.map(option=><button type="button" key={option.key} aria-label={option.name} aria-pressed={option.key===paletteKey} onClick={()=>setPaletteKey(option.key)} className="rounded-lg border p-2"><span className="flex h-6"><i className="flex-1" style={{background:option.background}}/><i className="flex-1" style={{background:option.ink}}/><i className="flex-1" style={{background:option.accent}}/></span><small>{option.name}</small></button>)}</div></details></>}
        {step===2&&<><p className="my-4 text-sm leading-7 text-neutral-500">Сохраним «{catalogName}» с выбранным оформлением. Следующий шаг — фотография, цена и варианты вашего первого товара.</p><p className="text-xs leading-6 text-neutral-500">В предпросмотре показан пример товара. Он не добавляется в ваш магазин.</p></>}
        {state.error&&<p role="alert" className="mt-4 text-sm text-red-700">{state.error}</p>}
        <div className="mt-8 flex gap-3">{step>0&&<button type="button" disabled={pending} className="btn btn-secondary" onClick={()=>setStep(step-1)}>Назад</button>}{step<2?<button type="button" disabled={catalogName.trim().length<2} className="btn btn-primary" onClick={()=>setStep(step+1)}>Продолжить <ArrowRight size={16}/></button>:<button disabled={pending||catalogName.trim().length<2} className="btn btn-primary">{pending?<><LoaderCircle size={16} className="animate-spin"/>Сохраняем…</>:"Сохранить и добавить товар"}</button>}</div>
      </section>
      <aside className="catalog-wizard-preview" aria-label="Предпросмотр каталога"><div className="border-b bg-white px-4 py-3 text-xs text-neutral-500">Предпросмотр · {catalogName}</div><NichePreview vertical={vertical} templateName={templateKey} storeName={catalogName} background={palette.background} surface={palette.surface} ink={palette.ink} muted={palette.muted} accent={palette.accent}/></aside>
    </div>
  </form>;
}
