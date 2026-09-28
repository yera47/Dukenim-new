import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";

export async function GET(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase().slice(0, 120) ?? "";
  const [users, profiles, memberships, staff, tenants] = await Promise.all([
    root.admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    root.admin.from("profiles").select("user_id,role"),
    root.admin.from("tenant_users").select("user_id,tenant_id,role"),
    root.admin.from("staff_access").select("id,user_id,tenant_id,title,active,revision"),
    root.admin.from("tenants").select("id,name"),
  ]);
  if (users.error || profiles.error || memberships.error || staff.error || tenants.error || !users.data) {
    return NextResponse.json({ error: "Не удалось загрузить все аккаунты" }, { status: 503 });
  }
  const names = new Map((tenants.data ?? []).map(item => [item.id, item.name]));
  const roles = new Map((profiles.data ?? []).map(item => [item.user_id, item.role]));
  const access = new Map<string, { name: string; role: string; active: boolean; accessId?: string; revision?: number }[]>();
  for (const item of memberships.data ?? []) {
    const entries = access.get(item.user_id) ?? [];
    entries.push({ name: names.get(item.tenant_id) ?? "Удалённый магазин", role: item.role, active: true });
    access.set(item.user_id, entries);
  }
  for (const item of staff.data ?? []) {
    if (!item.user_id) continue;
    const entries = access.get(item.user_id) ?? [];
    entries.push({ name: names.get(item.tenant_id) ?? "Удалённый магазин", role: item.title, active: item.active, accessId: item.id, revision: item.revision });
    access.set(item.user_id, entries);
  }
  const accounts = users.data.users
    .filter(user => !q || user.email?.toLowerCase().includes(q) || user.id.includes(q))
    .map(user => ({
      id: user.id,
      email: user.email ?? null,
      role: roles.get(user.id) ?? "buyer",
      blocked: Boolean(user.banned_until && new Date(user.banned_until) > new Date()),
      lastSignIn: user.last_sign_in_at ?? null,
      stores: access.get(user.id) ?? [],
    }));
  return NextResponse.json({ accounts, possiblyMore: users.data.users.length === 1000 }, { headers: { "Cache-Control": "no-store, private" } });
}
