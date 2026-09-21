import type{SupabaseClient}from"@supabase/supabase-js";import type{Database}from"@/types/database";
export async function getProfileRole(client:SupabaseClient<Database>,userId:string){return client.from("profiles").select("role").eq("user_id",userId).single()}
export async function getUserTenant(client:SupabaseClient<Database>,userId:string,preferredTenantId?:string|null){
  if(preferredTenantId&&/^[0-9a-f-]{36}$/i.test(preferredTenantId)){
    const selected=await client.from("tenant_users").select("tenant_id,role").eq("user_id",userId).eq("tenant_id",preferredTenantId).eq("role","owner").maybeSingle();
    if(selected.data)return selected;
  }
  const members=await client.from("tenant_users").select("tenant_id,role").eq("user_id",userId).eq("role","owner");
  if(members.error||!members.data?.length)return{data:null,error:members.error};
  if(members.data.length===1)return{data:members.data[0],error:null};
  const ordered=await client.from("tenants").select("id").in("id",members.data.map(item=>item.tenant_id)).order("created_at").limit(1).maybeSingle();
  return{data:members.data.find(item=>item.tenant_id===ordered.data?.id)??members.data[0],error:ordered.error};
}
