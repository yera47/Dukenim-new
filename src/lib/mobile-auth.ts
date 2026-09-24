import { createAdminClient } from "@/lib/supabase/admin";

const bearerPattern = /^Bearer\s+(.{20,})$/i;

export async function getMobileOwner(request: Request, tenantId: string) {
  const match = request.headers.get("authorization")?.match(bearerPattern);
  if (!match || !tenantId) return null;
  const admin = createAdminClient();
  const { data: auth, error } = await admin.auth.getUser(match[1]);
  if (error || !auth.user || !auth.user.email_confirmed_at) return null;
  const [{ data: profile }, { data: membership }] = await Promise.all([
    admin.from("profiles").select("role").eq("user_id", auth.user.id).maybeSingle(),
    admin.from("tenant_users").select("tenant_id,role").eq("tenant_id", tenantId).eq("user_id", auth.user.id).eq("role", "owner").maybeSingle(),
  ]);
  if (!profile || !["owner", "superadmin"].includes(profile.role) || (!membership && profile.role !== "superadmin")) return null;
  return { admin, user: auth.user, role: profile.role as "owner" | "superadmin", tenantId };
}
