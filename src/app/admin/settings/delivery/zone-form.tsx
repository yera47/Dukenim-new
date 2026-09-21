"use client";
import { useActionState, useState } from "react";
import { saveDeliveryZone, type DeliveryState } from "./actions";

type Zone = { id: string; name: string; cost: number; free_from: number | null; eta_text: string | null; is_active: boolean; provider: "own" | "yandex" };
export function ZoneForm({ zone }: { zone: Zone }) {
  const [state, action, pending] = useActionState(saveDeliveryZone, {} as DeliveryState);
  const [provider, setProvider] = useState(zone.provider);
  return <form action={action} className="card space-y-4 p-5">
    <input type="hidden" name="id" value={zone.id}/>
    <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
      <label className="sm:col-span-2">Кто доставляет<select className="input mt-2" name="provider" value={provider} onChange={(event) => setProvider(event.target.value as Zone["provider"])}><option value="own">Своя доставка</option><option value="yandex">Яндекс Доставка · оформляет магазин</option></select></label>
      <label>Город или зона<input className="input mt-2" name="name" required minLength={2} maxLength={100} defaultValue={zone.name} placeholder="Например, Кызылорда — центр"/></label>
      {provider === "own" ? <><label>Цена для покупателя, ₸<input className="input mt-2" name="cost" type="number" required min={0} max={2000000000} step={1} defaultValue={zone.cost}/></label><label>Бесплатно от, ₸ · необязательно<input className="input mt-2" name="freeFrom" type="number" min={0} max={2000000000} step={1} defaultValue={zone.free_from ?? ""}/></label></> : <><input type="hidden" name="cost" value="0"/><p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-950 sm:col-span-2">Цена Яндекс Доставки зависит от расстояния. Покупатель оформит заказ без указанной цены доставки. После заказа менеджер вызовет курьера от двери до двери и сообщит стоимость покупателю.</p></>}
      <label>Срок и часы доставки<input className="input mt-2" name="etaText" maxLength={200} defaultValue={zone.eta_text ?? ""} placeholder="Укажите ваши реальные сроки"/></label>
      <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={zone.is_active}/>Зона доступна покупателям</label>
      <button className="btn btn-primary" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить зону"}</button>
    </fieldset>
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    {state.success && <p role="status" className="text-sm">{state.success}</p>}
  </form>;
}
