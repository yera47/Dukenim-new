"use client";

import { useActionState } from "react";
import { deleteStore } from "./actions";

export function DeleteStoreForm({ id, slug }: { id: string; slug: string }) {
  const [state, action, pending] = useActionState(deleteStore, { error: null });
  return <details className="mt-4 rounded-xl border border-red-200 bg-red-50/50 p-4">
    <summary className="cursor-pointer font-semibold text-red-800">Удалить магазин</summary>
    <p className="mt-3 text-sm text-red-950">Удаление необратимо: товары, черновики и настройки исчезнут. Аккаунт останется. Магазин с заказами, клиентами, оплатами или активными подключениями удалить нельзя.</p>
    <form action={action} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="tenantId" value={id} />
      <label className="text-sm font-semibold">Введите адрес магазина <b>{slug}</b>
        <input className="input mt-2 w-full" name="confirmation" required autoComplete="off" aria-label={`Введите ${slug} для удаления`} />
      </label>
      {state.error && <p role="alert" className="text-sm font-semibold text-red-800">{state.error}</p>}
      <button disabled={pending} className="btn self-start bg-red-800 text-white hover:bg-red-900 disabled:opacity-50">{pending ? "Удаляем…" : "Удалить безвозвратно"}</button>
    </form>
  </details>;
}
