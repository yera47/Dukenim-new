import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";
import type { StaffPermissions } from "./staff-permissions";
export type StaffAccess = {id:string;tenant_id:string;user_id:string;title:string;permissions:StaffPermissions;active:boolean;notify_orders:boolean;revision:number};
type StaffDatabase = {public: Omit<Database["public"],"Tables"|"Functions"> & {
 Tables: Database["public"]["Tables"] & {
  staff_access:{Row:StaffAccess;Insert:Partial<StaffAccess>;Update:Partial<StaffAccess>;Relationships:[]};
  staff_invitations:{Row:{id:string;tenant_id:string;email:string;title:string;permissions:Json;expires_at:string;accepted_at:string|null;revoked_at:string|null;created_at:string};Insert:never;Update:never;Relationships:[]};
 };
 Functions: Database["public"]["Functions"] & {
  manage_staff:{Args:{p_tenant:string;p_action:string;p_data:Json};Returns:string};
  accept_staff_invitation:{Args:{p_hash:string};Returns:string};
  staff_orders:{Args:{p_access:string};Returns:Json};
  staff_directory:{Args:Record<string,never>;Returns:Json};
  can_notify_staff:{Args:{p_tenant:string;p_user:string};Returns:boolean};
  staff_module_data:{Args:{p_access:string;p_module:string};Returns:Json};
  staff_edit:{Args:{p_access:string;p_module:string;p_id:string;p_data:Json};Returns:boolean};
  staff_create_product:{Args:{p_access:string;p_request:string;p_data:Json};Returns:string};
  staff_apply_design:{Args:{p_access:string;p_generation:string;p_expected:string};Returns:boolean};
  staff_order_status:{Args:{p_access:string;p_order:string;p_expected:Database["public"]["Enums"]["order_status"];p_status:Database["public"]["Enums"]["order_status"]};Returns:boolean};
 };
}};
export async function createStaffClient() {return await createClient() as unknown as SupabaseClient<StaffDatabase>;}
export function createStaffAdminClient() {return createAdminClient() as unknown as SupabaseClient<StaffDatabase>;}
