import Link from "next/link";
import { ArrowRight, Plus, Store } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DeleteStoreForm } from "./delete-store-form";
import { switchStore } from "./actions";
import { ControlInventory } from "@/components/admin/control-inventory";

export const dynamic = "force-dynamic";

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { user, tenantId } = await requireRole(["owner", "superadmin"]);
  const client = await createClient();
  const { data: memberships } = await client.from("tenant_users").select("tenant_id").eq("user_id", user!.id).eq("role", "owner");
  const ids = memberships?.map(item => item.tenant_id) ?? [];
  const stores = ids.length ? (await client.from("tenants").select("id,name,slug,business_vertical,onboarding_completed,catalog_published,status").in("id", ids).order("created_at")).data ?? [] : [];
  const deleted = (await searchParams).deleted === "1";

  return <main className="min-h-screen bg-[var(--surface)] px-5 py-8 sm:py-14">
    <div className="mx-auto max-w-3xl">
      <Link href={tenantId ? "/admin" : "/"} className="text-sm font-semibold text-[var(--accent)]">← {tenantId ? "В кабинет" : "На главную"}</Link>
      <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
        <div><p className="data-label">ВАШИ МАГАЗИНЫ</p><h1 className="mt-2 text-3xl font-extrabold">Управление магазинами</h1><p className="muted mt-2">Каждый магазин имеет отдельные товары, заказы и настройки.</p></div>
        <Link href="/register?social=1" className="btn btn-primary"><Plus size={17} />Создать магазин</Link>
      </div>
      {deleted && <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-900">Магазин удалён. Ваш аккаунт сохранён.</p>}
      {stores.length ? <div className="mt-8 grid gap-4">{stores.map(store => <article key={store.id} className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-xl font-bold">{store.name}</h2><p className="muted mt-1 break-all text-sm">dukenim.kz/s/{store.slug}</p><p className="muted mt-2 text-sm">{store.business_vertical === "food" ? "Еда" : "Магазин"} · {store.catalog_published ? "Опубликован" : "Не опубликован"}{!store.onboarding_completed ? " · настройка не завершена" : ""}</p></div>
          {store.id === tenantId ? <span className="badge">Открыт сейчас</span> : <form action={switchStore}><input type="hidden" name="tenantId" value={store.id} /><button className="btn btn-primary">Открыть <ArrowRight size={16} /></button></form>}
        </div>
        <DeleteStoreForm id={store.id} slug={store.slug} />
      </article>)}</div> : <section className="card mt-8 p-8 text-center"><Store className="mx-auto text-[var(--accent)]" size={36} /><h2 className="mt-4 text-xl font-bold">Пока нет магазинов</h2><p className="muted mt-2">Начните с нового магазина. Ваш аккаунт уже готов — повторно регистрироваться не нужно.</p><Link href="/register?social=1" className="btn btn-primary mt-5">Создать магазин <ArrowRight size={16} /></Link></section>}
      <ControlInventory />
    </div>
  </main>;
}
