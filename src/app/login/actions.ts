"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileRole } from "@/lib/queries/auth";
import { createStaffClient } from "@/lib/staff-server";
export type LoginState = { error: string | null };
export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Введите email и пароль" };
  const client = await createClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Неверный email или пароль" };
  const { data: profile, error: profileError } = await getProfileRole(client, data.user.id);
  if (profileError || !profile) return { error: "Для аккаунта не назначена роль" };
  if(profile.role === "customer"){
    const staff=await createStaffClient();
    const memberships=await staff.from("staff_access").select("id").eq("user_id",data.user.id).eq("active",true).limit(1);
    if(memberships.data?.length)redirect("/staff");
  }
  redirect(profile.role === "superadmin" ? "/root" : profile.role === "owner" ? "/admin" : "/");
}
export async function logout() { const client = await createClient(); await client.auth.signOut(); redirect("/login"); }
