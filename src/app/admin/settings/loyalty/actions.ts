"use server";
import {requireRole} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {loyaltyClient} from "@/lib/loyalty-db";
import {loyaltyProgramSchema} from "@/lib/loyalty";
import {revalidatePath} from "next/cache";
export async function saveLoyalty(_: {error?:string;success?:string},form:FormData):Promise<{error?:string;success?:string}>{
 const context=await requireRole(["owner","superadmin"]);
 if(!context.tenantId)return {error:"Выберите магазин."};
 try{
  const parsed=loyaltyProgramSchema.safeParse(JSON.parse(String(form.get("program"))));
  if(!parsed.success)return {error:parsed.error.issues[0].message};
  const result=await loyaltyClient(await createClient()).rpc("save_loyalty_program",{p_tenant_id:context.tenantId,p_program:parsed.data});
  if(result.error)return {error:"Не удалось сохранить программу. Обновите страницу и повторите попытку."};
  revalidatePath("/admin/settings/loyalty");revalidatePath("/s/[slug]","layout");
  return {success:"Условия сохранены. Уже накопленные награды остались у гостей."};
 }catch{return {error:"Проверьте условия программы и попробуйте снова."};}
}
