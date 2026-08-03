import type{SupabaseClient}from"@supabase/supabase-js";import type{Database}from"@/types/database";
export async function getPublicTenantBySlug(client:SupabaseClient<Database>,slug:string){return client.from("tenants").select("id,slug,name,tagline,logo_url,accent_color,city,phone,whatsapp,instagram,plan,status").eq("slug",slug).in("status",["active","trial"]).single()}
