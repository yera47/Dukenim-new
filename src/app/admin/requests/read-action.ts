"use server";

import {z} from "zod";
import {getSessionContext} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";

export async function markSupportThreadRead(requestId:string):Promise<void> {
 const context=await getSessionContext();
 if(!context?.user||!["owner","superadmin"].includes(context.role))throw new Error("Войдите в аккаунт.");
 const parsed=z.string().uuid().safeParse(requestId);
 if(!parsed.success)throw new Error("Некорректное обращение.");
 const client=await createClient();
 let query=client.from("change_requests").select("id").eq("id",parsed.data);
 if(context.role!=="superadmin")query=query.eq("tenant_id",context.tenantId??"");
 const request=await query.maybeSingle();
 if(request.error||!request.data)throw new Error("Обращение недоступно.");
 const readClient=client as unknown as {rpc:(name:string,args:{p_request:string})=>Promise<{error:{message:string}|null}>};
 const result=await readClient.rpc("mark_support_thread_read",{p_request:parsed.data});
 if(result.error)throw new Error("Не удалось отметить сообщения прочитанными.");
}
