import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

export default async function RootAuditPage() {
  await requireRole(["superadmin"]);
  const client = createAdminClient();
  const [eventsResult, tenantsResult] = await Promise.all([
    client.from("platform_audit_events").select("id,tenant_id,action,reason,created_at").order("created_at", { ascending: false }).limit(200),
    client.from("tenants").select("id,name"),
  ]);
  if(eventsResult.error||tenantsResult.error)throw new Error("Не удалось загрузить аудит.");
  const names=new Map((tenantsResult.data??[]).map(tenant=>[tenant.id,tenant.name]));
  return <main className="min-h-screen bg-[var(--surface)] px-4 py-10"><div className="mx-auto max-w-6xl"><Link href="/root" className="text-sm font-bold text-[var(--accent)]">← Центр управления</Link><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-extrabold">Аудит платформы</h1><p className="muted mt-2">Последние действия суперадминистратора и системные события.</p></div><a href="/root/audit/export" className="btn btn-primary">Скачать CSV</a></div>
  <section className="card mt-6 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b"><th className="p-4">Когда</th><th>Магазин</th><th>Действие</th><th>Причина</th></tr></thead><tbody>{(eventsResult.data??[]).map(event=><tr key={event.id} className="border-b align-top last:border-0"><td className="p-4 whitespace-nowrap">{new Date(event.created_at).toLocaleString("ru-RU")}</td><td className="p-4">{event.tenant_id?names.get(event.tenant_id)??"Удалённый магазин":"Платформа"}</td><td className="p-4 font-semibold">{event.action}</td><td className="p-4">{event.reason??"—"}</td></tr>)}</tbody></table>{!eventsResult.data?.length&&<p className="muted p-5">Событий пока нет.</p>}</section><p className="muted mt-4 text-sm">На экране — последние 200 событий. CSV содержит до 10 000 событий, без секретов и произвольных данных из metadata.</p>
  </div></main>;
}
