"use client";

import {useActionState} from "react";
import {setRootAccountAccess,type AccountAccessState} from "./access-action";

const initial:AccountAccessState={error:"",success:""};

export function AccountAccessForm({userId,email,blocked}:{userId:string;email:string;blocked:boolean}){
  const[state,action,pending]=useActionState(setRootAccountAccess,initial);
  return <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
    <summary className="cursor-pointer font-bold text-slate-800">{blocked?"Восстановить новые входы":"Блокировать новые входы"}</summary>
    <p className="mt-2 leading-5 text-slate-600">Это действует для новых входов. Уже выданный токен может работать до истечения срока; для немедленного отзыва всех сессий нужна отдельная защита.</p>
    <form action={action} className="mt-3 grid gap-2">
      <input type="hidden" name="userId" value={userId}/><input type="hidden" name="expectedBlocked" value={String(blocked)}/><input type="hidden" name="block" value={String(!blocked)}/>
      <input name="confirmEmail" type="email" required autoComplete="off" placeholder={`Введите ${email}`} className="input text-xs"/>
      <input name="reason" required minLength={5} maxLength={1000} placeholder="Причина изменения" className="input text-xs"/>
      <button className="btn btn-secondary text-xs" disabled={pending}>{pending?"Сохраняем…":blocked?"Разрешить новые входы":"Блокировать новые входы"}</button>
      {state.error&&<p role="alert" className="text-red-700">{state.error}</p>}{state.success&&<p role="status" className="text-emerald-700">{state.success}</p>}
    </form>
  </details>;
}
