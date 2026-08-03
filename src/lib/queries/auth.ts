import type{SupabaseClient}from"@supabase/supabase-js";import type{Database}from"@/types/database";
export async function getProfileRole(client:SupabaseClient<Database>,userId:string){return client.from("profiles").select("role").eq("user_id",userId).single()}
export async function getUserTenant(client:SupabaseClient<Database>,userId:string){return client.from("tenant_users").select("tenant_id,role").eq("user_id",userId).limit(1).single()}
