import{redirect}from"next/navigation";import type{User}from"@supabase/supabase-js";import{createClient}from"@/lib/supabase/server";import{getProfileRole,getUserTenant}from"@/lib/queries/auth";
export type AppRole="customer"|"owner"|"superadmin";
export type SessionContext={user:User|null;role:AppRole;tenantId:string|null};
export async function getSessionContext(): Promise<SessionContext | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await getProfileRole(client, user.id);
  if (profileError || !profile || !["customer", "owner", "superadmin"].includes(profile.role)) return null;
  const tenant = ["owner", "superadmin"].includes(profile.role) ? await getUserTenant(client, user.id) : null;
  return { user, role: profile.role as AppRole, tenantId: tenant?.error ? null : tenant?.data?.tenant_id ?? null };
}
export async function requireRole(roles: AppRole[]): Promise<SessionContext> {
  // Missing configuration must never grant a fixture identity, even locally.
  const context = await getSessionContext();
  if (!context?.user) redirect("/login");
  if (!roles.includes(context.role)) redirect(context.role === "superadmin" ? "/root" : context.role === "owner" ? "/admin" : "/login");
  return context;
}
