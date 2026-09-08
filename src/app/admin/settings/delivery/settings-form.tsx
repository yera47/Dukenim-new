"use client";

import { useActionState } from "react";
import { saveDeliverySettings, type DeliveryState } from "./actions";

export function DeliverySettingsForm({ enabled, minOrder }: { enabled: boolean; minOrder: number }) {
  const [state, action, pending] = useActionState(saveDeliverySettings, {} as DeliveryState);
  return <form action={action} className="card space-y-4 p-5">
    <h2 className="text-xl font-semibold">Условия заказа</h2>
    <fieldset disabled={pending} className="space-y-4">
      <label className="flex items-center gap-2"><input name="deliveryEnabled" type="checkbox" defaultChecked={enabled}/>Предлагать доставку покупателям</label>
      <p className="text-sm text-neutral-500">Сначала добавьте доступную зону ниже. Выключение доставки не отменяет ранее принятые заказы.</p>
      <label className="block">Минимальная сумма товаров в заказе, ₸<input className="input mt-2" name="minOrder" type="number" min={0} max={2000000000} step={1} required defaultValue={minOrder}/></label>
      <button className="btn btn-primary" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить условия"}</button>
    </fieldset>
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    {state.success && <p role="status" className="text-sm">{state.success}</p>}
  </form>;
}
