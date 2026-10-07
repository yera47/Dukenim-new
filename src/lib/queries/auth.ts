import type{SupabaseClient}from"@supabase/supabase-js";import type{Database}from"@/types/database";import{storeArchiveEnabled}from"@/lib/store-archive-feature";
export async function getProfileRole(client:SupabaseClient<Database>,userId:string){return client.from("profiles").select("role").eq("user_id",userId).single()}
export async function getUserTenant(client:SupabaseClient<Database>,userId:string,preferredTenantId?:string|null){
  if(preferredTenantId&&/^[0-9a-f-]{36}$/i.test(preferredTenantId)){
    const selected=await client.from("tenant_users").select("tenant_id,role").eq("user_id",userId).eq("tenant_id",preferredTenantId).eq("role","owner").maybeSingle();
    if(selected.data){
      if(!storeArchiveEnabled())return selected;
      const active=await client.from("tenants").select("id").eq("id",selected.data.tenant_id).is("archived_at",null).maybeSingle();
      if(active.data)return selected;
    }
  }
  const members=await client.from("tenant_users").select("tenant_id,role").eq("user_id",userId).eq("role","owner");
  if(members.error||!members.data?.length)return{data:null,error:members.error};
  if(members.data.length===1)return{data:members.data[0],error:null};
  const archiveEnabled=storeArchiveEnabled();
  let tenants=client.from("tenants").select("id").in("id",members.data.map(item=>item.tenant_id));
  if(archiveEnabled)tenants=tenants.is("archived_at",null);
  const ordered=await tenants.order("created_at").limit(1).maybeSingle();
  if(!archiveEnabled)return{data:members.data.find(item=>item.tenant_id===ordered.data?.id)??members.data[0],error:ordered.error};
  if(ordered.error||!ordered.data)return{data:null,error:ordered.error};
  const orderedId=ordered.data.id;
  return{data:members.data.find(item=>item.tenant_id===orderedId)??null,error:null};
}
