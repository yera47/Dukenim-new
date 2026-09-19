"use server";
import{revalidatePath}from"next/cache";
import{z}from"zod";
import{requireRole}from"@/lib/auth";
import{createClient}from"@/lib/supabase/server";
import{smsClient}from"@/lib/sms-db";

const templates=z.object({order_created:z.string().trim().min(2).max(320),order_confirmed:z.string().trim().min(2).max(320),order_ready:z.string().trim().min(2).max(320),order_done:z.string().trim().min(2).max(320),order_cancelled:z.string().trim().min(2).max(320)}).strict();
export type SmsActionState={error?:string;success?:string};
export async function saveSmsSettings(_:SmsActionState,form:FormData):Promise<SmsActionState>{
 const{tenantId}=await requireRole(["owner","superadmin"]);const parsed=z.object({sender:z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,11}$/),transactional:z.boolean(),marketing:z.boolean(),templates}).safeParse({sender:form.get("sender"),transactional:form.get("transactional")==="on",marketing:form.get("marketing")==="on",templates:Object.fromEntries(Object.keys(templates.shape).map(key=>[key,String(form.get(key)??"")]))});
 if(!parsed.success)return{error:"Проверьте имя отправителя и шаблоны сообщений."};
 const{error}=await smsClient(await createClient()).rpc("save_sms_settings",{p_tenant:tenantId!,p_sender:parsed.data.sender,p_transactional:parsed.data.transactional,p_marketing:parsed.data.marketing,p_templates:parsed.data.templates});
 if(error)return{error:"Настройки не сохранены. Попробуйте ещё раз."};revalidatePath("/admin/settings/sms");return{success:"Настройки сохранены. Новое имя отправителя отправлено на модерацию."};
}
export async function queueCampaign(_:SmsActionState,form:FormData):Promise<SmsActionState>{
 const{tenantId}=await requireRole(["owner","superadmin"]);const parsed=z.object({title:z.string().trim().min(2).max(80),body:z.string().trim().min(2).max(480)}).safeParse({title:form.get("title"),body:form.get("body")});
 if(!parsed.success)return{error:"Укажите название и текст до 480 символов."};const{data,error}=await smsClient(await createClient()).rpc("queue_sms_campaign",{p_tenant:tenantId!,p_title:parsed.data.title,p_body:parsed.data.body});
 if(error)return{error:error.message.includes("sender")?"Сначала дождитесь одобрения имени отправителя и включите рассылки.":"Рассылка не создана."};revalidatePath("/admin/settings/sms");return{success:`В очередь добавлено: ${data??0}. Получат только клиенты, давшие согласие.`};
}
