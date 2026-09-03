"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { createStockMovement, type StockMovementState } from "@/app/admin/actions";

const initialState: StockMovementState = {};

export function StockMovementForm({ variantId, stock }: { variantId: string; stock: number }) {
  const [state, action, pending] = useActionState(createStockMovement, initialState);

  return <form action={action} className="grid min-w-[330px] grid-cols-[minmax(0,1fr)_72px_auto] items-start gap-2">
    <input type="hidden" name="variantId" value={variantId} />
    <select name="action" className="input h-10 text-xs" aria-label="Операция со складом" defaultValue="restock">
      <option value="restock">Поступление</option>
      <option value="writeoff">Списание</option>
      <option value="increase">Корректировка +</option>
      <option value="decrease">Корректировка −</option>
    </select>
    <input name="quantity" type="number" min={1} defaultValue={1} className="input h-10 px-2 text-center text-xs" aria-label="Количество" />
    <button disabled={pending || stock < 0} className="btn btn-secondary h-10 px-3 text-xs disabled:opacity-40">
      {pending ? <LoaderCircle size={15} className="animate-spin" /> : "Внести"}
    </button>
    {state.error && <p role="alert" className="col-span-3 text-xs font-medium text-red-700">{state.error}</p>}
    {state.success && <p role="status" className="col-span-3 text-xs font-medium text-emerald-700">{state.success}</p>}
  </form>;
}
