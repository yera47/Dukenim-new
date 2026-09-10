"use client";
import {useActionState} from "react";
import {updateStaffOrder} from "./actions";
import {orderStatusLabels,type OrderStatus} from "@/lib/order-display";
const next:Record<OrderStatus,OrderStatus[]>={new:["confirmed","cancelled"],confirmed:["assembled","cancelled"],assembled:["delivering","done","cancelled"],delivering:["done"],done:[],cancelled:[]};
export function StaffOrderControl({access,id,status}:{access:string;id:string;status:OrderStatus}){
 const[state,action,pending]=useActionState(updateStaffOrder,{});if(!next[status]?.length)return null;
 return <form action={action} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="p_access" value={access}/><input type="hidden" name="p_order" value={id}/><input type="hidden" name="p_expected" value={status}/><select name="p_status" className="rounded-lg border p-2">{next[status].map(value=><option key={value} value={value}>{orderStatusLabels[value]}</option>)}</select><button disabled={pending} className="rounded-lg bg-neutral-900 px-3 text-white">Подтвердить</button>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}</form>;
}
