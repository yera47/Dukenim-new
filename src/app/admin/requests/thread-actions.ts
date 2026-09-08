"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {getSessionContext} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
export async function openDomainSupport():Promise<void> {
 const context=await getSessionContext();
 if(!context?.user)redirect("/login");
 if(context.role!=="owner"||!context.tenantId)throw new Error("Откройте кабинет своего магазина.");
 const result=await (await createClient()).rpc("open_domain_support",{p_tenant_id:context.tenantId});
 if(result.error||!result.data)throw new Error("Обращение не отправлено. Повторите попытку.");
 revalidatePath("/root");revalidatePath("/admin/requests");
 redirect(`/admin/requests/${result.data}`);
}
export async function sendThreadMessage(_previous:{error?:string;saved?:boolean},form:FormData):Promise<{error?:string;saved?:boolean}> {
 const context=await getSessionContext();
 if(!context?.user||!["owner","superadmin"].includes(context.role))return{error:"Войдите в аккаунт."};
 const input=z.object({requestId:z.string().uuid(),messageId:z.string().uuid(),text:z.string().trim().min(2).max(3000)}).safeParse(Object.fromEntries(form));
 if(!input.success)return{error:"Сообщение должно содержать от 2 до 3000 символов."};
 const client=await createClient();
 let query=client.from("change_requests").select("id,tenant_id,status").eq("id",input.data.requestId);
 if(context.role!=="superadmin")query=query.eq("tenant_id",context.tenantId??"");
 const request=await query.maybeSingle();
 if(request.error||!request.data)return{error:"Обращение недоступно."};
 const fromRole=context.role==="superadmin"?"superadmin":"owner";
 const existing=await client.from("messages").select("id,text,from_role,request_id").eq("id",input.data.messageId).maybeSingle();
 if(existing.error)return{error:"Не удалось проверить отправку."};
 if(existing.data){if(existing.data.text!==input.data.text||existing.data.from_role!==fromRole||existing.data.request_id!==request.data.id)return{error:"Обновите чат перед отправкой."};return{saved:true};}
 const sent=await client.from("messages").insert({id:input.data.messageId,request_id:request.data.id,tenant_id:request.data.tenant_id,from_role:fromRole,text:input.data.text});
 if(sent.error)return{error:"Отправка не подтверждена. Повторите отправку — сообщение не будет продублировано."};
 revalidatePath(`/admin/requests/${request.data.id}`);revalidatePath(`/root/requests/${request.data.id}`);revalidatePath("/root");
 return{saved:true};
}
