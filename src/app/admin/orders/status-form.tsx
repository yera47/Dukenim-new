"use client";
import {useActionState} from 'react';
import {saveOrderStatus} from './status-action';
import {orderStatusLabels} from '@/lib/order-display';
import type {Database} from '@/types/database';
export function OrderStatusForm({id,status}:{id:string;status:Database['public']['Enums']['order_status']}){
 const [state,action,pending]=useActionState(saveOrderStatus,{});
 return <form action={action} className="space-y-2">
  <input type="hidden" name="orderId" value={id}/><input type="hidden" name="expected" value={status}/>
  <div className="flex flex-wrap gap-2"><select aria-label="Статус заказа" name="status" className="input max-w-48" defaultValue={status} disabled={pending||status==='cancelled'}>{Object.entries(orderStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
  {status!=='cancelled'&&<button disabled={pending} className="btn btn-secondary">{pending?'Сохраняем…':'Сохранить'}</button>}</div>
  {state.error&&<p role="alert" className="max-w-sm text-sm text-red-700">{state.error}</p>}{state.success&&<p role="status" className="max-w-sm text-sm">{state.success}</p>}
 </form>;
}
