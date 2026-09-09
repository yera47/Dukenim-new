"use server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reservationSettingsSchema,reservationsClient } from "@/lib/reservations";
import { revalidatePath } from "next/cache";
export type ReservationSettingsState={error?:string;success?:string};
export async function saveReservationSettings(_:ReservationSettingsState,form:FormData):Promise<ReservationSettingsState>{
 const context=await requireRole(["owner","superadmin"]);
 if(!context.user||!context.tenantId)return{error:"Войдите в аккаунт владельца."};
 const enabled=form.get("enabled")==="on";
 const parsed=reservationSettingsSchema.safeParse({enabled,holdHours:Number(form.get("holdHours")),location:Object.fromEntries(["address","hours","preparation","instructions","gisUrl","yandexUrl","embedUrl"].map(key=>[key,String(form.get(key)??"")]))});
 if(enabled&&!parsed.success)return{error:"Проверьте адрес, часы работы, срок хранения и ссылки на карты."};
 try{
  const client=reservationsClient(await createClient());
  const result=enabled&&parsed.success?await client.from("reservation_settings").upsert({tenant_id:context.tenantId,enabled:true,hold_hours:parsed.data.holdHours,location:parsed.data.location}).select("tenant_id").single():await client.from("reservation_settings").update({enabled:false}).eq("tenant_id",context.tenantId).select("tenant_id");
  if(result.error)return{error:"Настройки не сохранены."};
  revalidatePath("/admin/settings/delivery");revalidatePath("/s/[slug]/checkout","page");
  return{success:enabled?"Бронирование включено для новых запросов.":"Новые бронирования выключены. Ранее принятые остаются в заказах."};
 }catch{return{error:"Не удалось подтвердить сохранение."};}
}
