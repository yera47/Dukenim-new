"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {getSessionContext} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import {createPlatformAuditEvent} from "@/lib/queries/root";

type State={error?:string;saved?:boolean};
const messageSchema=z.object({tenantId:z.string().uuid(),messageId:z.string().uuid(),text:z.string().trim().min(2).max(3000)});

export async function sendGeneralSupportMessage(_:State,form:FormData):Promise<State>{
 const context=await getSessionContext();
 if(!context?.user||!["owner","superadmin"].includes(context.role))return{error:"Войдите в аккаунт."};
 const parsed=messageSchema.safeParse(Object.fromEntries(form));
 if(!parsed.success)return{error:"Сообщение должно содержать от 2 до 3000 символов."};
 const {tenantId,messageId,text}=parsed.data;
 if(context.role==="owner"&&context.tenantId!==tenantId)return{error:"Чат другого магазина недоступен."};
 const client=context.role==="superadmin"?createAdminClient():await createClient();
 const tenant=await client.from("tenants").select("id").eq("id",tenantId).maybeSingle();
 if(tenant.error||!tenant.data)return{error:"Магазин недоступен."};
 const fromRole=context.role==="superadmin"?"superadmin":"owner";
 const previous=await client.from("messages").select("id,tenant_id,request_id,from_role,text").eq("id",messageId).maybeSingle();
 if(previous.error)return{error:"Не удалось проверить повторную отправку."};
 if(previous.data){
  if(previous.data.tenant_id!==tenantId||previous.data.request_id!==null||previous.data.from_role!==fromRole||previous.data.text!==text)return{error:"Обновите чат перед отправкой."};
  return{saved:true};
 }
 if(context.role==="superadmin"){
  const audit=await createPlatformAuditEvent(client,{actorId:context.user.id,tenantId,action:"support.general_message_requested",metadata:{messageId}});
  if(audit.error)return{error:"Журнал аудита недоступен. Сообщение не отправлено."};
 }
 const sent=await client.from("messages").insert({id:messageId,tenant_id:tenantId,request_id:null,from_role:fromRole,text});
 if(sent.error)return{error:"Отправка не подтверждена. Повторите попытку: сообщение не продублируется."};
 revalidatePath("/root");revalidatePath("/admin/requests");
 return{saved:true};
}

export async function markGeneralSupportRead(tenantId:string):Promise<void>{
 const context=await getSessionContext();
 if(!context?.user||!["owner","superadmin"].includes(context.role))throw new Error("Войдите в аккаунт.");
 const parsed=z.string().uuid().safeParse(tenantId);
 if(!parsed.success||context.role==="owner"&&context.tenantId!==parsed.data)throw new Error("Чат недоступен.");
 const client=await createClient();
 const rpc=client as unknown as {rpc:(name:string,args:{p_tenant:string})=>Promise<{error:{message:string}|null}>};
 const result=await rpc.rpc("mark_general_support_read",{p_tenant:parsed.data});
 if(result.error)throw new Error("Не удалось отметить сообщения прочитанными.");
}
