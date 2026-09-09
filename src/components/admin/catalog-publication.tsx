"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { publishCatalog } from "@/app/admin/ai-studio/publish-action";
export function CatalogPublication(){
 const [pending,setPending]=useState(false),[error,setError]=useState("");const router=useRouter();
 return <section className="my-5 rounded-2xl border border-neutral-300 bg-white p-5" aria-label="Проверка и публикация">
  <h2 className="text-lg font-semibold">Магазин пока виден только вам</h2>
  <p className="mt-2 text-sm text-neutral-500">Добавьте товар с ценой и остатком, проверьте получение заказа. Затем откройте магазин покупателям.</p>
  <div className="my-4 flex flex-wrap gap-3 text-sm underline"><Link href="/store-preview" target="_blank">Проверить мой каталог ↗</Link><Link href="/admin/settings/delivery">Получение заказа</Link><Link href="/admin/integrations">Подключить оплату</Link></div>
  <button type="button" className="btn btn-primary" disabled={pending} onClick={async()=>{setPending(true);setError("");try{const result=await publishCatalog();if(result.error)setError(result.error);else router.refresh();}catch{setError("Не удалось подтвердить публикацию. Попробуйте снова.");}finally{setPending(false);}}}>{pending?"Проверяем…":"Опубликовать магазин"}</button>
  {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
 </section>;
}
