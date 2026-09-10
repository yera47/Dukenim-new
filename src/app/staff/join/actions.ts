"use server";
import { createHash } from "node:crypto";
import { createStaffClient } from "@/lib/staff-server";
import { redirect } from "next/navigation";
import {z} from "zod";
export async function registerStaff(_: {error?:string;success?:string},form:FormData):Promise<{error?:string;success?:string}>{
 const input=z.object({email:z.string().trim().email().max(254),password:z.string().min(10).max(128)}).safeParse({email:form.get("email"),password:form.get("password")});
 if(!input.success)return {error:"Введите email приглашения и пароль не короче 10 символов."};
 const client=await createStaffClient();const result=await client.auth.signUp({email:input.data.email,password:input.data.password,options:{emailRedirectTo:"https://www.dukenim.kz/auth/callback?next=/staff/join"}});
 if(result.error)return {error:"Не удалось создать аккаунт. Попробуйте вход или повторите регистрацию позже."};
 return {success:"Проверьте почту и подтвердите email, затем снова откройте ссылку приглашения. Магазин и права владельца не создаются."};
}
export async function acceptInvitation(_: {error?:string}, form:FormData):Promise<{error?:string}>{
 const token=String(form.get("token")??"");if(!/^[a-f0-9]{64}$/.test(token))return {error:"Ссылка приглашения неполная. Попросите владельца прислать новую."};
 const client=await createStaffClient();const {data:{user}}=await client.auth.getUser();
 if(!user)return {error:"Сначала войдите в аккаунт с email из приглашения, затем откройте эту ссылку снова."};
 const result=await client.rpc("accept_staff_invitation",{p_hash:createHash("sha256").update(token).digest("hex")});
 if(result.error)return {error:"Приглашение истекло, отозвано, уже принято либо email аккаунта не совпадает или не подтверждён. Проверьте email и обратитесь к владельцу."};
 redirect("/staff");
}
