"use server";

import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/auth";
import {createPlatformAuditEvent} from "@/lib/queries/root";
import {createAdminClient} from "@/lib/supabase/admin";

export type AccountAccessState={error:string;success:string};
const empty:AccountAccessState={error:"",success:""};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function setRootAccountAccess(_previous:AccountAccessState,form:FormData):Promise<AccountAccessState>{
  const context=await requireRole(["superadmin"]);
  if(!context.user)return{...empty,error:"Войдите в настоящий аккаунт суперадминистратора."};
  const targetId=String(form.get("userId")??"");
  const email=String(form.get("confirmEmail")??"").trim().toLowerCase();
  const expected=String(form.get("expectedBlocked"))==="true";
  const block=String(form.get("block"))==="true";
  const reason=String(form.get("reason")??"").trim();
  if(!uuid.test(targetId)||targetId===context.user.id||!email||expected===block||reason.length<5||reason.length>1000)
    return{...empty,error:"Проверьте аккаунт, email и причину изменения."};
  const client=createAdminClient();
  const [userResult,profileResult]=await Promise.all([
    client.auth.admin.getUserById(targetId),
    client.from("profiles").select("role").eq("user_id",targetId).maybeSingle(),
  ]);
  const user=userResult.data.user;
  if(userResult.error||!user||profileResult.error||user.email?.toLowerCase()!==email)
    return{...empty,error:"Аккаунт не найден или email не совпадает."};
  if(profileResult.data?.role==="superadmin")return{...empty,error:"Аккаунт суперадминистратора нельзя заблокировать здесь."};
  const blocked=Boolean(user.banned_until&&new Date(user.banned_until)>new Date());
  if(blocked!==expected)return{...empty,error:"Состояние аккаунта изменилось. Обновите страницу."};
  const audit=await createPlatformAuditEvent(client,{actorId:context.user.id,action:"account.login_access_requested",reason,metadata:{userId:targetId,beforeBlocked:blocked,afterBlocked:block}});
  if(audit.error)return{...empty,error:"Журнал аудита недоступен. Изменение не выполнено."};
  const result=await client.auth.admin.updateUserById(targetId,{ban_duration:block?"876000h":"none"});
  if(result.error)return{...empty,error:"Не удалось изменить вход. Обновите список и попробуйте снова."};
  await createPlatformAuditEvent(client,{actorId:context.user.id,action:block?"account.login_blocked":"account.login_restored",reason,metadata:{userId:targetId}});
  revalidatePath("/root/accounts");
  return{...empty,success:block?"Новые входы в аккаунт заблокированы.":"Новые входы в аккаунт снова разрешены."};
}
