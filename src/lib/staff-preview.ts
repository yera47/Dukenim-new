import "server-only";
import {z} from "zod";
import {createStaffClient} from "./staff-server";
import {createAdminClient} from "./supabase/admin";
import {staffCan} from "./staff-permissions";
import {computeEntitlement} from "./entitlement";
export async function staffPreviewContext(access:unknown){
 if(!z.string().uuid().safeParse(access).success)return null;
 const client=await createStaffClient();const {data:{user}}=await client.auth.getUser();if(!user)return null;
 const {data:member,error}=await client.from("staff_access").select("*").eq("id",access as string).eq("user_id",user.id).eq("active",true).maybeSingle();
 if(error||!member||!staffCan(member.permissions,"studio","read"))return null;
 const admin=createAdminClient();const tenant=await admin.from("tenants").select("plan,next_plan,status,trial_ends_at").eq("id",member.tenant_id).single();
 if(!tenant.data||!computeEntitlement(tenant.data).active||computeEntitlement(tenant.data).plan==="basic")return null;
 return {client:admin,tenantId:member.tenant_id,user,write:staffCan(member.permissions,"studio","write")};
}
