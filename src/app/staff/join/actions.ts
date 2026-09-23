"use server";
import { createHash } from "node:crypto";
import { createStaffAdminClient, createStaffClient } from "@/lib/staff-server";
import { redirect } from "next/navigation";
import {z} from "zod";
import {isStaffPasswordAllowed,STAFF_INVITATION_TOKEN,STAFF_PASSWORD_MIN_LENGTH} from "@/lib/staff-invitation";
export async function registerStaff(_: {error?:string;success?:string},form:FormData):Promise<{error?:string;success?:string}>{
 const input=z.object({email:z.string().trim().email().max(254),password:z.string().min(STAFF_PASSWORD_MIN_LENGTH).max(128),token:z.string().regex(STAFF_INVITATION_TOKEN)}).safeParse({email:form.get("email"),password:form.get("password"),token:form.get("token")});
 if(!input.success)return {error:`Введите email приглашения и пароль не короче ${STAFF_PASSWORD_MIN_LENGTH} символов.`};
 const email=input.data.email.toLowerCase();
 if(!isStaffPasswordAllowed(input.data.password,email))return {error:"Выберите более надёжную длинную фразу без email, названия Dukenim и распространённых комбинаций."};
 const hash=createHash("sha256").update(input.data.token).digest("hex");
 const admin=createStaffAdminClient();
 const invitation=await admin.from("staff_invitations").select("id,email,expires_at,accepted_at,revoked_at").eq("token_hash",hash).maybeSingle();
 if(invitation.error||!invitation.data||invitation.data.accepted_at||invitation.data.revoked_at||Date.parse(invitation.data.expires_at)<=Date.now())return {error:"Приглашение недействительно. Попросите владельца создать новую ссылку."};
 if(invitation.data.email.toLowerCase()!==email)return {error:"Введите тот же email, для которого владелец создал приглашение."};
 const created=await admin.auth.admin.createUser({email,password:input.data.password,email_confirm:true});
 if(created.error||!created.data.user)return {error:created.error?.message.toLowerCase().includes("already")?"Аккаунт с этим email уже есть. Выберите «Войти и продолжить».":"Не удалось создать аккаунт сотрудника. Повторите попытку."};
 const client=await createStaffClient();
 const signedIn=await client.auth.signInWithPassword({email,password:input.data.password});
 if(signedIn.error){await admin.auth.admin.deleteUser(created.data.user.id);return {error:"Аккаунт не удалось открыть. Повторите регистрацию."};}
 const accepted=await client.rpc("accept_staff_invitation",{p_hash:hash});
 if(accepted.error){await client.auth.signOut();await admin.auth.admin.deleteUser(created.data.user.id);return {error:"Не удалось принять приглашение. Попросите владельца создать новую ссылку."};}
 redirect("/staff");
}
export async function acceptInvitation(_: {error?:string}, form:FormData):Promise<{error?:string}>{
 const token=String(form.get("token")??"");if(!STAFF_INVITATION_TOKEN.test(token))return {error:"Ссылка приглашения неполная. Попросите владельца прислать новую."};
 const client=await createStaffClient();const {data:{user}}=await client.auth.getUser();
 if(!user)return {error:"Сначала войдите в аккаунт с email из приглашения, затем откройте эту ссылку снова."};
 const result=await client.rpc("accept_staff_invitation",{p_hash:createHash("sha256").update(token).digest("hex")});
 if(result.error)return {error:"Приглашение истекло, отозвано, уже принято либо email аккаунта не совпадает или не подтверждён. Проверьте email и обратитесь к владельцу."};
 redirect("/staff");
}
