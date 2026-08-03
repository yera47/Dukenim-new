import{createClient}from"@/lib/supabase/server";
export async function getTenantBySlug(slug:string){const client=await createClient();return client.from("tenants").select("*").eq("slug",slug).single()}
export async function getActiveProducts(tenantId:string){const client=await createClient();return client.from("products").select("*,product_variants(*)").eq("tenant_id",tenantId).eq("is_active",true).order("sort_order")}
export async function getCurrentProfile(userId:string){const client=await createClient();return client.from("profiles").select("role").eq("user_id",userId).single()}
export async function getTenantOrders(tenantId:string){const client=await createClient();return client.from("orders").select("*,customers(name,phone),order_items(*)").eq("tenant_id",tenantId).order("created_at",{ascending:false})}
