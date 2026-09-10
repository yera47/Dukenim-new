"use server";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/auth";
import { createStaffClient } from "@/lib/staff-server";
import { staffPermissionsSchema } from "@/lib/staff-permissions";
export type TeamState={error?:string;success?:string;invitation?:string};
export async function manageTeam(_:TeamState,form:FormData):Promise<TeamState>{
 const context=await getSessionContext();
 if(!context?.user||!context.tenantId||context.role!=="owner")return {error:"Управлять командой может только владелец магазина."};
 const action=String(form.get("action"));
 let data:Record<string,string|number|boolean|Record<string,string>>={};let token="";
 if(action==="invite"||action==="update"){
  const title=z.string().trim().min(1).max(80).safeParse(form.get("title"));
  const permissions=staffPermissionsSchema.safeParse(Object.fromEntries(Object.keys(staffPermissionsSchema.shape).map(key=>[key,form.get(key)])));
  if(!title.success||!permissions.success)return {error:"Укажите должность и разрешения для каждого раздела."};
  data={title:title.data,permissions:permissions.data};
  if(action==="invite"){
   const email=z.string().trim().email().max(254).safeParse(form.get("email"));if(!email.success)return {error:"Укажите email сотрудника."};
   token=randomBytes(32).toString("hex");data.email=email.data.toLowerCase();data.token_hash=createHash("sha256").update(token).digest("hex");
  }else{
   const id=z.string().uuid().safeParse(form.get("id"));const revision=z.coerce.number().int().positive().safeParse(form.get("revision"));
   if(!id.success||!revision.success)return {error:"Обновите список сотрудников."};
   data={...data,id:id.data,revision:revision.data,active:form.get("active")==="on",notify_orders:form.get("notify_orders")==="on"};
  }
 }else if(action==="revoke_invite"){
  const id=z.string().uuid().safeParse(form.get("id"));if(!id.success)return {error:"Приглашение не найдено."};data={id:id.data};
 }else return {error:"Неизвестное действие."};
 const client=await createStaffClient();const result=await client.rpc("manage_staff",{p_tenant:context.tenantId,p_action:action,p_data:data});
 if(result.error)return {error:"Не удалось сохранить. Проверьте права владельца и обновите страницу: запись могла измениться."};
 revalidatePath("/admin/team");revalidatePath("/staff");
 return token?{success:"Приглашение действует 7 дней. Передайте ссылку сотруднику лично; письмо автоматически не отправляется.",invitation:`/staff/join#${token}`}:{success:"Сохранено. Новые права применяются при следующем запросе."};
}
