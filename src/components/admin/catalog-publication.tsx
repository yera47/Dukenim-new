"use client";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { publishCatalog } from "@/app/admin/ai-studio/publish-action";
import { AlertCircle, Check, ChevronUp, Rocket } from "lucide-react";
type PublicationChecks={product:boolean;fulfilment:boolean;tariff:boolean};
export function CatalogPublication({checks}:{checks:PublicationChecks}){
 const [pending,setPending]=useState(false),[error,setError]=useState("");const router=useRouter();
 const ready=checks.product&&checks.fulfilment&&checks.tariff;
 return <details open={error?true:undefined} className="mb-2 overflow-hidden rounded-2xl border border-[#cfd9e4] bg-white shadow-[0_10px_34px_#173b5712]" aria-label="Проверка и публикация">
  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
   <span className={`grid size-8 shrink-0 place-items-center rounded-full ${ready?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{ready?<Rocket size={16}/>:<AlertCircle size={16}/>}</span>
   <span className="min-w-0 flex-1"><b className="block truncate text-sm">{ready?"Магазин готов к публикации":"Завершите запуск магазина"}</b><small className="block truncate text-[11px] text-neutral-500">{ready?"Откройте витрину покупателям":"Нажмите, чтобы увидеть недостающие шаги"}</small></span>
   {ready&&<button type="button" className="btn btn-primary min-h-9 px-3 text-xs" disabled={pending} onClick={async event=>{event.preventDefault();setPending(true);setError("");try{const result=await publishCatalog();if(result.error)setError(result.error);else router.refresh();}catch{setError("Не удалось подтвердить публикацию. Попробуйте снова.");}finally{setPending(false);}}}>{pending?"Проверяем…":<><span className="sm:hidden">Опубликовать</span><span className="hidden sm:inline">Опубликовать магазин</span></>}</button>}
   <ChevronUp size={17} className="details-chevron rotate-180 text-neutral-400" aria-hidden="true"/>
  </summary>
  <div className="border-t px-4 pb-4 pt-3">
   <p className="text-xs leading-5 text-neutral-600">Магазин пока виден только вам. Выполните три условия и откройте его покупателям.</p>
   <div className="mt-3 grid gap-2 text-xs">
    <Link href="/admin/catalog" className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3">{checks.product?<Check size={15} className="text-emerald-600"/>:<AlertCircle size={15} className="text-amber-700"/>}<span className="flex-1">Активный товар с ценой и остатком</span><b>{checks.product?"Готово":"Открыть"}</b></Link>
    <Link href="/admin/settings/delivery" className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3">{checks.fulfilment?<Check size={15} className="text-emerald-600"/>:<AlertCircle size={15} className="text-amber-700"/>}<span className="flex-1">Доставка, самовывоз или бронь</span><b>{checks.fulfilment?"Готово":"Настроить"}</b></Link>
    <Link href="/admin/plan" className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3">{checks.tariff?<Check size={15} className="text-emerald-600"/>:<AlertCircle size={15} className="text-amber-700"/>}<span className="flex-1">Действующий пробный период или тариф</span><b>{checks.tariff?"Готово":"Открыть"}</b></Link>
   </div>
   <div className="mt-3 flex flex-wrap items-center gap-3"><Link href="/store-preview" target="_blank" className="text-xs font-bold text-[var(--accent)] underline">Предпросмотр магазина ↗</Link>{!ready&&<span className="text-[11px] text-neutral-500">Кнопка публикации появится после готовности.</span>}</div>
   {error&&<p role="alert" className="mt-3 text-xs font-semibold text-red-700">{error}</p>}
  </div>
 </details>;
}
