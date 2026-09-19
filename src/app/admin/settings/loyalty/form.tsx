"use client";
import {useActionState,useState} from "react";
import {LoyaltyEditor} from "@/components/admin/loyalty-editor";
import {newLoyaltyProgram,type LoyaltyProgram} from "@/lib/loyalty";
import {saveLoyalty} from "./actions";
export function LoyaltySettingsForm({initial}:{initial:LoyaltyProgram|null}){
 const [program,setProgram]=useState(initial??newLoyaltyProgram);
 const [state,action,pending]=useActionState(saveLoyalty,{});
 return <form action={action} className="mt-6 max-w-2xl"><fieldset disabled={pending} className="space-y-6"><input type="hidden" name="program" value={JSON.stringify(program)}/><LoyaltyEditor value={program} onChange={setProgram}/><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={program.enabled} onChange={e=>setProgram({...program,enabled:e.target.checked})}/>Начислять прогресс по новым заказам</label><p className="text-xs leading-6 text-neutral-500">При изменении правила гости начинают копить по новым условиям. Прежние отметки и доступные награды сохраняются на отдельной карте.</p>{state.error&&<p role="alert" className="text-red-700">{state.error}</p>}{state.success&&<p role="status" className="text-green-700">{state.success}</p>}<button className="btn btn-primary" disabled={pending}>{pending?"Сохраняем…":"Сохранить программу"}</button></fieldset></form>;
}
