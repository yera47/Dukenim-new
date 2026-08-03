"use server";
import{redirect}from"next/navigation";import{createClient}from"@/lib/supabase/server";import{getProfileRole}from"@/lib/queries/auth";
export type LoginState={error:string|null};
export async function login(_:LoginState,formData:FormData):Promise<LoginState>{const email=String(formData.get("email")??"").trim().toLowerCase();const password=String(formData.get("password")??"");if(!email||!password)return{error:"Введите email и пароль"};const client=await createClient();const{data,error}=await client.auth.signInWithPassword({email,password});if(error||!data.user)return{error:"Неверный email или пароль"};const{data:profile,error:profileError}=await getProfileRole(client,data.user.id);if(profileError||!profile)return{error:"Для аккаунта не назначена роль"};redirect(profile.role==="superadmin"?"/root":profile.role==="owner"?"/admin":"/s/demo-shop")}
export async function logout(){const client=await createClient();await client.auth.signOut();redirect("/login")}
