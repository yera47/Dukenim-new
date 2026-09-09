"use server";
import {getSessionContext} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {reservationsClient,reservationLabels} from "@/lib/reservations";
import {revalidatePath} from "next/cache";
import {z} from "zod";
export type ReservationActionState={error?:string;success?:string};
export async function manageReservation(_: ReservationActionState,form:FormData):Promise<ReservationActionState>{
 const context=await getSessionContext();if(!context?.user||!context.tenantId)return{error:"Войдите в аккаунт владельца."};
 const parsed=z.object({id:z.string().uuid(),action:z.enum(["confirm","collect","cancel"])}).safeParse({id:form.get("id"),action:form.get("action")});
 if(!parsed.success)return{error:"Проверьте действие."};
 if(parsed.data.action==="collect"&&form.get("paidConfirmed")!=="on")return{error:"Подтвердите, что товар выдан и оплата получена."};
 try{
  const {data,error}=await reservationsClient(await createClient()).rpc("manage_merchandise_reservation",{p_order_id:parsed.data.id,p_action:parsed.data.action});
  if(error)return{error:"Действие не подтверждено. Обновите страницу и проверьте бронь."};
  revalidatePath("/admin/orders");revalidatePath("/admin/stock");revalidatePath("/admin/analytics");revalidatePath("/s/[slug]","layout");
  return{success:reservationLabels[data]};
 }catch{return{error:"Связь прервалась. Проверьте статус перед повторением."};}
}
