"use client";
import React, { useEffect, useState } from "react";
import { brandColorsSchema } from "@/lib/brand-materials";
export function BrandMaterials() {
  const [notes,setNotes]=useState("");const[revision,setRevision]=useState<number|null>(null);
  const [colors,setColors]=useState<string[]>([]);const[logoUrl,setLogoUrl]=useState<string|null>(null);
  const [file,setFile]=useState<File|null>(null);const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    void fetch("/api/brand-materials",{cache:"no-store",signal:controller.signal}).then(async response=>{
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      if(!controller.signal.aborted){setNotes(data.notes);setRevision(data.revision);setLogoUrl(data.logoUrl);setColors(brandColorsSchema.parse(data.colors));}
    }).catch(e=>{if(!controller.signal.aborted)setMessage(e instanceof Error?e.message:"Материалы не загрузились.");});
    return()=>controller.abort();
  },[]);
  async function save() {
    if(revision===null||busy)return;setBusy(true);setMessage("");
    try {
      const form=new FormData();form.set("revision",String(revision));form.set("notes",notes);if(file)form.set("logo",file);
      const response=await fetch("/api/brand-materials",{method:"POST",body:form});const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Не удалось сохранить.");
      setRevision(data.revision);setColors(brandColorsSchema.parse(data.colors));setFile(null);
      const refreshed=await fetch("/api/brand-materials",{cache:"no-store"});
      if(refreshed.ok){const latest=await refreshed.json();setLogoUrl(latest.logoUrl);}else setLogoUrl(null);
      setMessage("Сохранено приватно. AI учитывает правила и цвета в следующем ответе; опубликованный дизайн не изменён.");
    } catch(e){setMessage(e instanceof Error?e.message:"Связь прервалась. Ваш текст остался на экране.");}
    finally{setBusy(false);}
  }
  return <details className="mx-auto my-4 max-w-3xl rounded-2xl border p-4">
    <summary className="cursor-pointer font-semibold">Логотип и правила бренда · необязательно</summary>
    <p className="my-3 text-sm text-neutral-500">Без брендбука тоже можно. Загрузите логотип и опишите пожелания.</p>
    <form onSubmit={event=>{event.preventDefault();void save();}} className="space-y-4">
      <fieldset disabled={busy||revision===null} className="space-y-4">
        <label className="block text-sm">Логотип (PNG, JPEG, WebP, до 3 МБ)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>setFile(event.target.files?.[0]??null)} className="mt-2 block w-full"/></label>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logoUrl&&<img src={logoUrl} alt="Сохранённый логотип бренда" className="max-h-24 max-w-48 object-contain"/>}
        <label className="block text-sm">Правила из брендбука или ваши пожелания<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={6000} rows={6} className="input mt-2 w-full" placeholder="Цвета, шрифты, характер магазина, чего избегать. Можно вставить текст из брендбука."/></label>
        <p className="text-xs text-neutral-500">После сохранения включите «Проанализировать сохранённый логотип» в чате — изображение будет отправлено модели Azure. Без этой опции используются только текст и приблизительные цвета. PDF пока не загружается.</p>
        {colors.length>0&&<div className="flex flex-wrap gap-3" aria-label="Извлечённые цвета">{colors.map(color=><span key={color} className="inline-flex items-center gap-1 text-xs"><i aria-hidden className="inline-block size-5 rounded-full border" style={{backgroundColor:color}}/>{color}</span>)}</div>}
        <button className="btn btn-secondary">{busy?"Сохраняем…":"Сохранить материалы для AI"}</button>
      </fieldset>
      {message&&<p role="status" className="text-sm">{message}</p>}
    </form>
  </details>;
}
