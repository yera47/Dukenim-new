"use client";

import { useActionState } from "react";
import { syncOrderToPlanfixAction, type PlanfixSyncState } from "./planfix-sync-action";

const initialState: PlanfixSyncState = {};

export function PlanfixOrderSyncButton({ orderId, status }: { orderId: string; status?: string }) {
  const [state, action, pending] = useActionState(syncOrderToPlanfixAction, initialState);
  if (status === "synced") return <p className="text-xs font-bold text-emerald-700">Передан в Planfix</p>;
  if (status === "uncertain") return <p className="text-xs font-bold text-amber-800">Проверьте заказ в Planfix перед повтором</p>;
  return <form action={action} className="mt-3 grid gap-2">
    <input type="hidden" name="orderId" value={orderId}/>
    <button className="btn btn-secondary" type="submit" disabled={pending}>{pending ? "Передаём…" : status === "failed" ? "Повторить отправку в Planfix" : "Передать в Planfix"}</button>
    <p className="max-w-72 text-xs leading-5 text-[var(--ink-60)]">В Planfix будут переданы имя, телефон, состав, сумма и способ получения этого заказа.</p>
    {state.error && <p role="alert" className="text-xs font-bold text-red-700">{state.error}</p>}
    {state.success && <p role="status" className="text-xs font-bold text-emerald-700">{state.success}</p>}
  </form>;
}
