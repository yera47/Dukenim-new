"use client";
import {useActionState} from "react";
import {manageRemoteKaspiPayment} from "./status-action";
import {money} from "@/lib/demo-data";
export function KaspiPayment({orderId,paid,invoiceSent,total,refunded=false}:{orderId:string;paid:boolean;invoiceSent:boolean;total:number;refunded?:boolean}){
 const[state,action,pending]=useActionState(manageRemoteKaspiPayment,{});
 if(refunded)return <p className="mt-3 text-sm font-semibold text-amber-800">Возврат Kaspi отмечен.</p>;
 return <div className="mt-4 max-w-md rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm"><b>Удалённая оплата Kaspi Pay · {money(total)}</b>
  {!paid&&<p className="mt-2">{invoiceSent?'Вы отметили отправку счёта.':'Откройте Kaspi Pay → Удалённая оплата → Выставить счёт. Телефон покупателя указан выше.'} Покупатель также может открыть ссылку магазина в «Моих заказах». Сверяйте сумму и номер заказа в Kaspi POS.</p>}
  {!paid&&!invoiceSent&&<form action={action} className="mt-3 space-y-2"><input type="hidden" name="orderId" value={orderId}/><input type="hidden" name="action" value="invoice_sent"/><label className="flex items-start gap-2 text-xs"><input type="checkbox" name="confirmed" required/>Подтверждаю, что отправил счёт в Kaspi Pay на номер покупателя.</label><button className="btn btn-secondary text-xs" disabled={pending}>Счёт отправлен покупателю</button></form>}
  <form action={action} className="mt-3 space-y-3"><input type="hidden" name="orderId" value={orderId}/>
   <label className="block text-xs font-semibold">{paid?'Номер операции возврата':'Номер операции или чека оплаты'}<input name="reference" className="input mt-1" minLength={4} maxLength={100} required placeholder="Из истории Kaspi Pay"/></label>
   <label className="flex items-start gap-2 text-xs"><input type="checkbox" name="confirmed" required/>Подтверждаю, что лично проверил {paid?'возврат денег покупателю':'поступление точной суммы'} в Kaspi Pay.</label>
   <button name="action" value={paid?'refunded':'paid'} className="btn btn-cta text-xs" disabled={pending}>{pending?'Сохраняем…':paid?'Отметить возврат':'Подтвердить оплату'}</button>
  </form>{state.error&&<p role="alert" className="mt-2 text-red-700">{state.error}</p>}{state.success&&<p role="status" className="mt-2 text-emerald-800">{state.success}</p>}
 </div>;
}
