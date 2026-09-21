import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

type PageProps = { searchParams: Promise<{ q?: string }> };

export default async function RootAccountsPage({ searchParams }: PageProps) {
  await requireRole(["superadmin"]);
  const query = (await searchParams).q?.trim().toLowerCase().slice(0, 120) ?? "";
  const client = createAdminClient();
  const [usersResult, profilesResult, membershipsResult, staffResult, tenantsResult] = await Promise.all([
    client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    client.from("profiles").select("user_id,role"),
    client.from("tenant_users").select("user_id,tenant_id,role"),
    client.from("staff_access").select("user_id,tenant_id,title,active"),
    client.from("tenants").select("id,name"),
  ]);
  const error = usersResult.error ?? profilesResult.error ?? membershipsResult.error ?? staffResult.error ?? tenantsResult.error;
  if (error) throw new Error("Не удалось загрузить список аккаунтов.");
  const names = new Map((tenantsResult.data ?? []).map(tenant => [tenant.id, tenant.name]));
  const roles = new Map((profilesResult.data ?? []).map(profile => [profile.user_id, profile.role]));
  const memberships = membershipsResult.data ?? [];
  const staff = staffResult.data ?? [];
  const users = (usersResult.data.users ?? []).filter(user => !query || user.email?.toLowerCase().includes(query) || user.id.includes(query));

  return <main className="min-h-screen bg-[var(--surface)] px-4 py-10"><div className="mx-auto max-w-6xl">
    <Link href="/root" className="text-sm font-bold text-[var(--accent)]">← Центр управления</Link>
    <h1 className="mt-5 text-3xl font-extrabold">Аккаунты платформы</h1>
    <p className="muted mt-2">Владельцы и сотрудники всех магазинов. Личные данные доступны только суперадминистратору.</p>
    <form className="mt-6 flex max-w-xl gap-2"><input name="q" type="search" defaultValue={query} placeholder="Email или ID аккаунта" className="input"/><button className="btn btn-primary">Найти</button></form>
    <section className="card mt-6 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b"><th className="p-4">Аккаунт</th><th>Роль</th><th>Магазины и доступ</th><th>Последний вход</th></tr></thead><tbody>{users.map(user => <tr key={user.id} className="border-b align-top last:border-0"><td className="p-4"><b>{user.email ?? "Email не указан"}</b><small className="muted mt-1 block">{user.id}</small>{user.banned_until && new Date(user.banned_until)>new Date() && <span className="mt-2 inline-block rounded bg-red-50 px-2 py-1 text-red-700">Вход заблокирован</span>}</td><td className="p-4">{roles.get(user.id) ?? "Покупатель"}</td><td className="p-4"><div className="space-y-1">{memberships.filter(item => item.user_id===user.id).map(item => <Link key={item.tenant_id} href={`/root/stores/${item.tenant_id}`} className="block font-semibold text-[var(--accent)]">{names.get(item.tenant_id) ?? "Удалённый магазин"} · {item.role}</Link>)}{staff.filter(item => item.user_id===user.id).map(item => <Link key={item.tenant_id} href={`/root/stores/${item.tenant_id}`} className="block font-semibold text-[var(--accent)]">{names.get(item.tenant_id) ?? "Удалённый магазин"} · {item.title} · {item.active ? "доступен" : "отозван"}</Link>)}{!memberships.some(item=>item.user_id===user.id)&&!staff.some(item=>item.user_id===user.id)&&<span className="muted">Нет доступа к магазину</span>}</div></td><td className="p-4">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("ru-RU") : "Не входил"}</td></tr>)}</tbody></table>{!users.length&&<p className="muted p-6">Аккаунтов по запросу нет.</p>}</section>
    <p className="muted mt-4 text-sm">Показаны первые 1000 аккаунтов. Смена ролей и блокировка требуют отдельной проверки действующих сессий и аудита, поэтому здесь пока только просмотр.</p>
  </div></main>;
}
