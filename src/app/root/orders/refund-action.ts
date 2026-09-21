"use server";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {getSessionContext} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
type State={error?:string;success?:string};
const schema=z.object({orderId:z.string().uuid(),number:z.coerce.number().int().positive(),total:z.coerce.number().int().nonnegative(),reference:z.string().trim().min(4).max(100),reason:z.string().trim().min(5).max(1000)});
export async function refundRootCashOrder(_:State,form:FormData):Promise<State>{
 const context=await getSessionContext();
 if(context?.role!=="superadmin"||!context.user)return{error:"Действие доступно только суперадминистратору."};
 if(form.get("confirmed")!=="on")return{error:"Подтвердите фактический возврат денег покупателю."};
 const parsed=schema.safeParse(Object.fromEntries(form));
 if(!parsed.success)return{error:"Проверьте номер заказа, сумму, чек и причину возврата."};
 const client=await createClient();
 const rpc=client as unknown as {rpc:(name:string,args:{p_order:string;p_number:number;p_total:number;p_reference:string;p_reason:string})=>Promise<{data:string|null;error:{message:string}|null}>};
 const result=await rpc.rpc("root_refund_cash_order",{p_order:parsed.data.orderId,p_number:parsed.data.number,p_total:parsed.data.total,p_reference:parsed.data.reference,p_reason:parsed.data.reason});
 if(result.error||result.data!=="refunded")return{error:"Возврат не отмечен. Проверьте фактический платёж и обновите заказ."};
 revalidatePath(`/root/orders/${parsed.data.orderId}`);revalidatePath("/root/orders");revalidatePath("/admin/orders");
 return{success:"Фактический возврат наличных записан в аудит. Неисполненный заказ отменён."};
}
