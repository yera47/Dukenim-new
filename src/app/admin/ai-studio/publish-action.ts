"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
export async function publishCatalog():Promise<{error?:string;success?:boolean}>{
 const session=await requireRole(["owner","superadmin"]);
 if(!session.tenantId)return{error:"Откройте магазин владельца."};
 const {data,error}=await (await createClient()).rpc("publish_catalog",{p_tenant_id:session.tenantId});
 if(error||!data){
  const message=error?.message??"";
  if(message.includes("available product"))return{error:"Добавьте активный товар и укажите остаток больше нуля."};
  if(message.includes("Delivery zone"))return{error:"Добавьте хотя бы одну активную зону доставки."};
  if(message.includes("Pickup address"))return{error:"Укажите полный адрес самовывоза."};
  if(message.includes("Receiving method"))return{error:"Настройте доставку, самовывоз или бронь."};
  if(message.includes("inactive"))return{error:"Пробный период закончился. Выберите тариф, чтобы открыть магазин."};
  return{error:"Проверка публикации не завершилась. Откройте недостающий шаг и повторите."};
 }
 revalidatePath("/admin/ai-studio");revalidatePath("/s/[slug]","layout");
 return{success:true};
}
