"use client";
import {useActionState} from "react";
import {saveUnitCost} from "@/app/admin/stock/cost-action";
export function UnitCostForm({variantId,cost}:{variantId:string;cost:number|null}) {
  const [state,action,pending]=useActionState(saveUnitCost,{});
  return <form action={action} className="min-w-48"><input type="hidden" name="variantId" value={variantId}/><div className="flex gap-2"><input aria-label="Себестоимость единицы, тенге" name="unitCost" type="number" min={0} max={2000000000} step={1} defaultValue={cost??""} placeholder="Не указана" className="input w-28"/><button disabled={pending} className="btn btn-secondary px-3 text-xs">{pending?"…":"Сохранить"}</button></div>{state.error&&<p role="alert" className="mt-2 text-xs text-red-700">{state.error}</p>}{state.success&&<p role="status" className="mt-2 text-xs">{state.success}</p>}</form>;
}
