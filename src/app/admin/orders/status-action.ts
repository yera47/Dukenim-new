"use server";
import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {getSessionContext} from '@/lib/auth';
import {createClient} from '@/lib/supabase/server';
import {loyaltyClient} from '@/lib/loyalty-db';
const status=z.enum(['new','confirmed','assembled','delivering','done','cancelled']);
const input=z.object({orderId:z.string().uuid(),status,expected:status});
export type OrderStatusState={error?:string;success?:string};
export async function manageRemoteKaspiPayment(_:OrderStatusState,form:FormData):Promise<OrderStatusState>{
 const context=await getSessionContext();
 if(!context?.user||!['owner','superadmin'].includes(context.role))return{error:'Войдите как владелец магазина.'};
 const orderId=z.string().uuid().safeParse(form.get('orderId'));
 const action=z.enum(['invoice_sent','paid','refunded']).safeParse(form.get('action'));
 const reference=String(form.get('reference')??'').trim();
 if(!orderId.success||!action.success)return{error:'Проверьте заказ и действие.'};
 if(form.get('confirmed')!=='on')return{error:'Подтвердите проверку в Kaspi Pay.'};
 if(action.data!=='invoice_sent'&&(reference.length<4||reference.length>100))return{error:'Укажите номер операции или чека из Kaspi Pay.'};
 try{
  const client=await createClient();
  let scoped=client.from('orders').select('id,tenant_id,payment_method').eq('id',orderId.data).eq('payment_method','kaspi');
  if(context.role!=='superadmin')scoped=scoped.eq('tenant_id',context.tenantId??'');
  const order=await scoped.maybeSingle();if(order.error||!order.data)return{error:'Заказ недоступен.'};
  const rpc=client as unknown as {rpc:(name:string,args:{p_order:string;p_action:string;p_reference:string|null})=>Promise<{data:string|null;error:{message:string}|null}>};
  const result=await rpc.rpc('manage_kaspi_remote_order',{p_order:orderId.data,p_action:action.data,p_reference:reference||null});
  if(result.error||!result.data)return{error:'Операция не сохранена. Проверьте текущий статус заказа.'};
  revalidatePath('/admin/orders');revalidatePath('/root/orders');revalidatePath(`/root/orders/${orderId.data}`);
  return{success:action.data==='invoice_sent'?'Отправка счёта отмечена. Покупатель увидит подсказку в «Моих заказах».':action.data==='paid'?'Оплата и заказ подтверждены после вашей проверки в Kaspi Pay. Покупатель увидит новый статус.':'Возврат отмечен после вашей проверки в Kaspi Pay.'};
 }catch{return{error:'Нет связи. Обновите заказ перед повторным действием.'};}
}
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
