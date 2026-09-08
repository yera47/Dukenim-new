"use server";
import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {getSessionContext} from '@/lib/auth';
import {createClient} from '@/lib/supabase/server';
const status=z.enum(['new','confirmed','assembled','delivering','done','cancelled']);
const input=z.object({orderId:z.string().uuid(),status,expected:status});
export type OrderStatusState={error?:string;success?:string};
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
