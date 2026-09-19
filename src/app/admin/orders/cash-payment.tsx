"use client";
import {useActionState} from "react";
import {confirmCashPayment} from "./status-action";
export function CashPayment({orderId,paid}:{orderId:string;paid:boolean}){
 const [state,action,pending]=useActionState(confirmCashPayment,{});
 return <form action={action} className="mt-4 max-w-xs space-y-2 rounded-xl border border-neutral-200 p-3 text-xs"><input type="hidden" name="orderId" value={orderId}/><input type="hidden" name="refund" value={String(paid)}/><label className="flex items-start gap-2"><input type="checkbox" required name="confirmed"/>{paid?"Подтверждаю, что вернул покупателю оплату наличными":"Подтверждаю, что получил оплату наличными"}</label><button disabled={pending} className="btn btn-secondary w-full text-xs">{pending?"Сохраняем…":paid?"Отметить возврат":"Отметить оплату"}</button>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}</form>;
}
