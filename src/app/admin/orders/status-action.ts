"use server";
import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {getSessionContext} from '@/lib/auth';
import {createClient} from '@/lib/supabase/server';
import {loyaltyClient} from '@/lib/loyalty-db';
const status=z.enum(['new','confirmed','assembled','delivering','done','cancelled']);
const input=z.object({orderId:z.string().uuid(),status,expected:status});
export type OrderStatusState={error?:string;success?:string};
export async function confirmCashPayment(_:OrderStatusState,form:FormData):Promise<OrderStatusState>{
 const context=await getSessionContext();
 if(!context?.tenantId||!['owner','superadmin'].includes(context.role)||form.get('confirmed')!=='on')return {error:'Подтвердите получение или возврат наличных.'};
 const orderId=z.string().uuid().safeParse(form.get('orderId'));if(!orderId.success)return {error:'Заказ недоступен.'};
 const client=await createClient();
 const scoped=await client.from('orders').select('id').eq('id',orderId.data).eq('tenant_id',context.tenantId).maybeSingle();
 if(!scoped.data)return {error:'Заказ недоступен.'};
 const result=await loyaltyClient(client).rpc('owner_confirm_cash',{p_order:orderId.data,p_refund:form.get('refund')==='true'});
 if(result.error)return {error:'Не удалось изменить оплату. Обновите заказ.'};
 revalidatePath('/admin/orders');return {success:'Статус оплаты сохранён.'};
}
export async function saveOrderStatus(_:OrderStatusState,form:FormData):Promise<OrderStatusState>{
 const context=await getSessionContext();
 if(!context?.user||!context.tenantId||!['owner','superadmin'].includes(context.role))return {error:'Войдите в аккаунт владельца.'};
 const parsed=input.safeParse({orderId:form.get('orderId'),status:form.get('status'),expected:form.get('expected')});
 if(!parsed.success)return {error:'Обновите страницу и выберите статус заказа.'};
 try{
  const client=await createClient();
  const result=await client.from('orders').update({status:parsed.data.status}).eq('id',parsed.data.orderId).eq('tenant_id',context.tenantId).eq('status',parsed.data.expected).select('id').maybeSingle();
  if(result.error)return {error:result.error.message.includes('Refund payment')?'Сначала оформите возврат оплаты. Автоматический возврат денег здесь не выполняется.':result.error.message.includes('cannot be reopened')?'Отменённый заказ нельзя открыть повторно. Создайте новый заказ.':'Не удалось сохранить статус. Заказ и остатки не изменены.'};
  if(!result.data)return {error:'Заказ изменён в другой вкладке или недоступен. Обновите страницу.'};
  revalidatePath('/admin/orders');revalidatePath('/admin/stock');revalidatePath('/s/[slug]','layout');
  return {success:parsed.data.status==='cancelled'?'Заказ отменён. Списанный товар возвращён в остаток.':'Статус сохранён.'};
 }catch{return {error:'Связь прервалась. Обновите страницу, чтобы проверить статус.'};}
}
