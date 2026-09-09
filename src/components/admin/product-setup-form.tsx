"use client";
import React,{startTransition,useActionState,useEffect,useRef,useState} from "react";
import {createProductAction,type ProductActionState} from "@/app/admin/actions";
import {businessWorkflow} from "@/lib/business-workflow";
import type {BusinessVertical} from "@/types/database";
import Image from "next/image";

export function ProductSetupForm({categories=[],vertical="other"}:{categories?:Array<{id:string;name:string}>;vertical?:BusinessVertical}){
  const [state,action,pending]=useActionState(createProductAction,{} as ProductActionState);
  const [step,setStep]=useState(0);const[title,setTitle]=useState("");const[price,setPrice]=useState("");const[error,setError]=useState("");
  const[photos,setPhotos]=useState<string[]>([]);const form=useRef<HTMLFormElement>(null);const workflow=businessWorkflow(vertical);
  useEffect(()=>()=>photos.forEach(url=>URL.revokeObjectURL(url)),[photos]);
  function validate(current:number){
    if(current===0&&title.trim().length<2){setError("Введите название — минимум 2 символа.");return false;}
    const inputs=form.current?.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>(`[data-product-step="${current}"] input, [data-product-step="${current}"] textarea, [data-product-step="${current}"] select`);
    for(const input of inputs??[]){if(!input.checkValidity()){input.reportValidity();setError("Проверьте заполненные поля.");return false;}}
    setError("");return true;
  }
  function next(){if(!pending&&validate(step))setStep(Math.min(3,step+1));}
  return <form ref={form} noValidate onSubmit={event=>{
    event.preventDefault();
    if(pending){event.preventDefault();return;}
    if(step<3){event.preventDefault();next();return;}
    for(let index=0;index<3;index++){if(!validate(index)){event.preventDefault();setStep(index);return;}}
    const data=new FormData(event.currentTarget);
    startTransition(()=>action(data));
  }} className="mt-5 space-y-5" aria-label="Пошаговое добавление первого товара">
    <input type="hidden" name="fromStudio" value="true"/>
    <nav aria-label="Шаги первого товара" className="flex flex-wrap gap-3 border-b pb-3 text-sm">{["Название","Фото","Цена и наличие","Проверка"].slice(0,step+1).map((label,index)=>index<step?<button type="button" disabled={pending} key={label} className="text-neutral-500" onClick={()=>{setError("");setStep(index);}}>✓ {label}</button>:<strong key={label} aria-current="step">{index+1}. {label}</strong>)}</nav>
    <p className="text-sm text-neutral-500">Оформление магазина уже сохранено. Теперь добавим настоящий товар — по одному шагу. Данные товара сохраняются после финальной кнопки.</p>
    <fieldset disabled={pending} className="min-w-0 space-y-4">
      <section data-product-step="0" hidden={step!==0} className="space-y-4">
        <h3 className="text-xl font-semibold">Что добавим в каталог?</h3>
        <label className="block text-sm">Название<input name="title" required minLength={2} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} className="input mt-2" placeholder={workflow.titleExample}/></label>
        {categories.length>0&&<label className="block text-sm">Раздел<select aria-label="Раздел" name="categoryId" className="input mt-2" defaultValue=""><option value="">Без раздела</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
        <label className="block text-sm">Описание · необязательно<textarea name="description" maxLength={2000} rows={4} className="input mt-2" placeholder={workflow.descriptionHint}/></label>
      </section>
      <section data-product-step="1" hidden={step!==1} className="space-y-4">
        <h3 className="text-xl font-semibold">Покажите товар покупателю</h3>
        <p className="text-sm text-neutral-500">Используйте свои фотографии. Первое фото будет обложкой. До четырёх файлов, каждый до 5 МБ. Можно добавить позже.</p>
        <label className="block rounded-2xl border border-dashed p-5 text-sm">Выбрать фотографии<input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-3 block w-full" onChange={e=>{
          const files=Array.from(e.target.files??[]);if(files.length>4||files.some(file=>file.size>5*1024*1024||!["image/jpeg","image/png","image/webp"].includes(file.type))){e.target.value="";setPhotos([]);setError("Выберите до 4 фотографий PNG, JPEG или WebP, не больше 5 МБ каждая.");return;}
          setError("");setPhotos(files.map(file=>URL.createObjectURL(file)));
        }}/></label>
        {photos.length>0&&<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{photos.map((url,index)=><Image unoptimized width={320} height={400} src={url} alt={`Фото товара ${index+1}`} key={url} className="aspect-[4/5] w-full rounded-xl object-cover"/>)}</div>}
      </section>
      <section data-product-step="2" hidden={step!==2} className="space-y-4">
        <h3 className="text-xl font-semibold">Цена и доступное количество</h3>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Цена, ₸<input name="price" type="number" min={0} step={1} required value={price} onChange={e=>setPrice(e.target.value)} className="input mt-2"/></label><label className="text-sm">Старая цена · необязательно<input name="oldPrice" type="number" min={0} step={1} className="input mt-2"/></label></div>
        <p className="text-sm text-neutral-500">{workflow.stockHelp} Если вариантов нет, заполните только количество в первой строке. При нуле покупка недоступна.</p>
        {[0,1,2].map(index=><div key={index} className="rounded-xl border p-3"><p className="mb-3 text-xs text-neutral-500">{index===0?"Основной вариант":"Дополнительный вариант · необязательно"}</p><div className="grid grid-cols-2 gap-3">
          <label className="text-xs">{workflow.optionLabel}<input name="size" maxLength={80} className="input mt-1"/></label><label className="text-xs">{workflow.detailLabel}<input name="color" maxLength={80} className="input mt-1"/></label><label className="text-xs">Артикул · необязательно<input name="sku" maxLength={80} className="input mt-1"/></label><label className="text-xs">Количество<input name="stock" type="number" min={0} step={1} defaultValue={0} className="input mt-1"/></label>
        </div></div>)}
        <p className="text-xs text-neutral-500">Себестоимость можно указать после сохранения в «Складе». Она видна только владельцу и нужна для расчёта валовой прибыли.</p>
      </section>
      <section data-product-step="3" hidden={step!==3} className="space-y-4">
        <h3 className="text-xl font-semibold">Проверим перед сохранением</h3>
        <div className="flex gap-4 rounded-2xl border bg-white p-4">{photos[0]&&<Image unoptimized width={112} height={140} src={photos[0]} alt="Обложка товара" className="h-32 w-24 rounded-lg object-cover"/>}<div className="min-w-0"><strong className="break-words">{title}</strong><p className="mt-2">{new Intl.NumberFormat("ru-KZ").format(Number(price)||0)} ₸</p><p className="mt-2 text-xs text-neutral-500">{photos.length?`Фотографий: ${photos.length}`:"Фото можно добавить позже"}</p></div></div>
        <label className="flex items-center gap-3 text-sm"><input name="isActive" type="checkbox" defaultChecked/>Показывать товар в каталоге</label>
        <p className="text-xs text-neutral-500">Магазин не публикуется этой кнопкой. После добавления проверим витрину и отдельно откроем её покупателям.</p>
      </section>
      {(error||state.error)&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error||state.error}</p>}
      <div className="flex gap-3">{step>0&&<button type="button" className="btn btn-secondary" onClick={()=>{setError("");setStep(step-1);}}>Назад</button>}{step<3?<button key="next" type="button" onClick={next} className="btn btn-primary">Продолжить →</button>:<button key="save" type="submit" className="btn btn-primary">{pending?"Сохраняем…":"Сохранить товар"}</button>}</div>
    </fieldset>
  </form>;
}
