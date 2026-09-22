"use client";
import {useActionState} from "react";
import {saveKaspiRemoteSettings} from "@/app/admin/integrations/kaspi-remote-action";

export function KaspiRemoteSettings({enabled,link}:{enabled:boolean;link:string|null}){
 const[state,action,pending]=useActionState(saveKaspiRemoteSettings,{});
 return <form action={action} className="mt-5 space-y-4 rounded-2xl border border-sky-200 bg-sky-50/50 p-5">
  <label className="flex items-start gap-3 text-sm font-semibold"><input type="checkbox" name="enabled" defaultChecked={enabled} className="mt-1"/><span>Принимать удалённую оплату Kaspi Pay по заказам этого магазина<small className="mt-1 block font-normal text-neutral-600">Нужен действующий Kaspi Pay вашего бизнеса. Покупатель увидит способ оплаты при оформлении заказа.</small></span></label>
  <label className="block text-sm font-semibold">Ссылка Kaspi для перехода · необязательно<input name="link" type="url" defaultValue={link??""} className="input mt-2" placeholder="https://…kaspi.kz/…" autoComplete="url"/><small className="mt-1 block font-normal text-neutral-600">Dukenim покажет точную сумму, а покупатель откроет ссылку и введёт её в Kaspi сам. Сам переход не подтверждает оплату. Без ссылки вы сможете выставить счёт по номеру покупателя.</small></label>
  <button disabled={pending} className="btn btn-cta">{pending?"Сохраняем…":"Сохранить Kaspi Pay"}</button>
  {state.error&&<p role="alert" className="text-sm text-red-700">{state.error}</p>}{state.success&&<p role="status" className="text-sm text-emerald-800">{state.success}</p>}
 </form>;
}
