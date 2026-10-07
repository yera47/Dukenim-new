"use client";

import { useActionState } from "react";
import { archiveStore, restoreStore } from "./actions";

type Props = { id: string; slug: string; mode: "archive" | "restore" };

export function StoreArchiveForm({ id, slug, mode }: Props) {
  const action = mode === "archive" ? archiveStore : restoreStore;
  const [state, submit, pending] = useActionState(action, { error: null });
  const archive = mode === "archive";
  return <details className={`mt-4 rounded-xl border p-4 ${archive ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/60"}`}>
    <summary className={`cursor-pointer font-semibold ${archive ? "text-amber-950" : "text-emerald-950"}`}>
      {archive ? "Переместить в архив" : "Восстановить магазин"}
    </summary>
    <p className="mt-3 text-sm text-slate-700">
      {archive
        ? "Аккаунт, товары, заказы и настройки сохранятся. Витрина станет недоступна покупателям, пока вы не восстановите магазин. Архивация не отменяет платную подписку."
        : "Магазин снова появится в рабочем пространстве. Публикация вернётся в прежнее состояние, если подписка или пробный период всё ещё действуют."}
    </p>
    <form action={submit} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="tenantId" value={id} />
      <label className="text-sm font-semibold">Введите адрес магазина <b>{slug}</b>
        <input className="input mt-2 w-full" name="confirmation" required autoComplete="off" aria-label={`Введите ${slug}`} />
      </label>
      <label className="text-sm font-semibold">Причина
        <textarea className="input mt-2 min-h-24 w-full resize-y" name="reason" minLength={3} maxLength={1000} required aria-label="Причина" />
      </label>
      {state.error && <p role="alert" className="text-sm font-semibold text-red-800">{state.error}</p>}
      <button disabled={pending} className={`btn self-start disabled:opacity-50 ${archive ? "bg-amber-900 text-white hover:bg-amber-950" : "bg-emerald-800 text-white hover:bg-emerald-900"}`}>
        {pending ? "Сохраняем…" : archive ? "Архивировать магазин" : "Восстановить магазин"}
      </button>
    </form>
  </details>;
}
