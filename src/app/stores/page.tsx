import Link from "next/link";
import { ArchiveRestore, ArrowRight, Plus, Store } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StoreArchiveForm } from "./store-archive-form";
import { switchStore } from "./actions";
import { ACTIVE_STORE_COLUMNS, ARCHIVE_STORE_COLUMNS, storeArchiveEnabled } from "@/lib/store-archive-feature";

export const dynamic = "force-dynamic";

type StoreRecord = {
  id: string;
  name: string;
  slug: string;
  business_vertical: string | null;
  onboarding_completed: boolean;
  catalog_published: boolean;
  status: string;
  archived_at?: string | null;
  archive_reason?: string | null;
};

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ archived?: string; restored?: string }> }) {
  const { user, tenantId } = await requireRole(["owner", "superadmin"]);
  const client = await createClient();
  const archiveEnabled = storeArchiveEnabled();
  const { data: memberships } = await client.from("tenant_users").select("tenant_id").eq("user_id", user!.id).eq("role", "owner");
  const ids = memberships?.map(item => item.tenant_id) ?? [];
  const stores = (ids.length ? (await client.from("tenants").select(archiveEnabled ? ARCHIVE_STORE_COLUMNS : ACTIVE_STORE_COLUMNS).in("id", ids).order("created_at")).data ?? [] : []) as unknown as StoreRecord[];
  const activeStores = stores.filter(store => !("archived_at" in store) || !store.archived_at);
  const archivedStores = stores.filter(store => "archived_at" in store && Boolean(store.archived_at));
  const params = archiveEnabled ? await searchParams : {};

  return <main className="min-h-screen bg-[var(--surface)] px-5 py-8 sm:py-14">
    <div className="mx-auto max-w-3xl">
      <Link href={tenantId ? "/admin" : "/"} className="text-sm font-semibold text-[var(--accent)]">← {tenantId ? "В кабинет" : "На главную"}</Link>
      <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
        <div><p className="data-label">Ваши магазины</p><h1 className="mt-2 text-3xl font-extrabold">Управление магазинами</h1><p className="muted mt-2">У каждого магазина отдельные товары, заказы, оформление и архив.</p></div>
        <Link href="/register?social=1" className="btn btn-primary"><Plus size={17} />Создать магазин</Link>
      </div>
      {params.archived === "1" && <p role="status" className="mt-6 rounded-xl bg-amber-50 p-4 font-semibold text-amber-950">Магазин в архиве. Аккаунт и данные сохранены.</p>}
      {params.restored === "1" && <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-950">Магазин восстановлен.</p>}
      {activeStores.length ? <div className="mt-8 grid gap-4">{activeStores.map(store => <article key={store.id} className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-xl font-bold">{store.name}</h2><p className="muted mt-1 break-all text-sm">dukenim.kz/s/{store.slug}</p><p className="muted mt-2 text-sm">{store.catalog_published ? "Витрина опубликована" : "Витрина не опубликована"}{!store.onboarding_completed ? " · настройка не завершена" : ""}</p></div>
          {store.id === tenantId ? <span className="badge">Открыт сейчас</span> : <form action={switchStore}><input type="hidden" name="tenantId" value={store.id} /><button className="btn btn-primary">Открыть <ArrowRight size={16} /></button></form>}
        </div>
        {archiveEnabled ? <StoreArchiveForm id={store.id} slug={store.slug} mode="archive" /> : null}
      </article>)}</div> : <section className="card mt-8 p-8 text-center"><Store className="mx-auto text-[var(--accent)]" size={36} /><h2 className="mt-4 text-xl font-bold">Нет активных магазинов</h2><p className="muted mt-2">Аккаунт сохранён. Создайте новый магазин или восстановите один из архива.</p><Link href="/register?social=1" className="btn btn-primary mt-5">Создать магазин <ArrowRight size={16} /></Link></section>}

      {archivedStores.length ? <section className="mt-10"><div className="flex items-center gap-3"><ArchiveRestore size={22} /><div><h2 className="text-xl font-bold">Архив</h2><p className="muted text-sm">Архивные магазины скрыты от покупателей, но данные сохранены.</p></div></div><div className="mt-4 grid gap-4">{archivedStores.map(store => <article key={store.id} className="card p-5 sm:p-6"><h3 className="text-lg font-bold">{store.name}</h3><p className="muted mt-1 break-all text-sm">dukenim.kz/s/{store.slug}</p>{store.archive_reason && <p className="muted mt-2 text-sm">Причина: {store.archive_reason}</p>}<StoreArchiveForm id={store.id} slug={store.slug} mode="restore" /></article>)}</div></section> : null}
    </div>
  </main>;
}
