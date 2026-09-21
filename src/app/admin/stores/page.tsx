import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { switchStore } from "./actions";

export default async function StoresPage() {
  const { user, tenantId } = await requireRole(["owner", "superadmin"]);
  const client = await createClient();
  const { data: memberships } = await client.from("tenant_users").select("tenant_id").eq("user_id", user!.id).eq("role", "owner");
  const ids = memberships?.map(item => item.tenant_id) ?? [];
  const stores = ids.length ? (await client.from("tenants").select("id,name,slug,business_vertical,onboarding_completed").in("id", ids).order("created_at")).data ?? [] : [];
  return <div className="mx-auto max-w-3xl"><p className="data-label">ВАШИ МАГАЗИНЫ</p><h1 className="mt-2 text-3xl font-semibold">Выберите магазин</h1><p className="muted mt-2">Один вход для всех ваших проектов. Данные, заказы и настройки каждого магазина остаются отдельными.</p>
    <div className="mt-8 grid gap-3">{stores.map(store => <form key={store.id} action={switchStore} className="card flex flex-wrap items-center gap-4 p-5"><input type="hidden" name="tenantId" value={store.id}/><div className="min-w-0 flex-1"><b className="block truncate text-lg">{store.name}</b><span className="muted text-sm">{store.business_vertical === "food" ? "Еда" : "Магазин"} · dukenim.kz/s/{store.slug}{!store.onboarding_completed && " · настройка не завершена"}</span></div>{store.id === tenantId ? <span className="badge">Открыт сейчас</span> : <button className="btn btn-primary">Открыть</button>}</form>)}</div>
  </div>;
}
