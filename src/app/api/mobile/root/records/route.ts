import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";

export async function GET(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  const section = new URL(request.url).searchParams.get("section");
  if (section === "audit") {
    const [events, tenants] = await Promise.all([
      root.admin.from("platform_audit_events").select("id,tenant_id,action,reason,created_at").order("created_at", { ascending: false }).limit(200),
      root.admin.from("tenants").select("id,name"),
    ]);
    if (events.error || tenants.error || !events.data || !tenants.data) return NextResponse.json({ error: "Не удалось загрузить аудит" }, { status: 503 });
    const names = new Map(tenants.data.map(row => [row.id, row.name]));
    return NextResponse.json({ section, events: events.data.map(row => ({ ...row, storeName: row.tenant_id ? names.get(row.tenant_id) ?? "Удалённый магазин" : "Платформа" })), limit: 200 }, { headers: { "Cache-Control": "no-store, private" } });
  }
  if (section === "finance") {
    const [tenants, subscriptions, checkouts, crm] = await Promise.all([
      root.admin.from("tenants").select("id,name"),
      root.admin.from("subscriptions").select("tenant_id,plan,status,current_period_end,polar_subscription_id").order("started_at", { ascending: false }).limit(200),
      root.admin.from("subscription_checkout_requests").select("tenant_id,plan,final_amount,status,created_at").order("created_at", { ascending: false }).limit(200),
      root.admin.from("crm_setup_charges").select("tenant_id,amount_kzt,status,polar_order_id,created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    if (tenants.error || subscriptions.error || checkouts.error || crm.error || !tenants.data || !subscriptions.data || !checkouts.data || !crm.data) {
      return NextResponse.json({ error: "Не удалось загрузить финансовые записи" }, { status: 503 });
    }
    const names = new Map(tenants.data.map(row => [row.id, row.name]));
    const storeName = (id: string) => names.get(id) ?? "Удалённый магазин";
    return NextResponse.json({ section, subscriptions: subscriptions.data.map(row => ({ ...row, storeName: storeName(row.tenant_id) })), checkouts: checkouts.data.map(row => ({ ...row, storeName: storeName(row.tenant_id) })), crm: crm.data.map(row => ({ ...row, storeName: storeName(row.tenant_id) })), limit: 200 }, { headers: { "Cache-Control": "no-store, private" } });
  }
  return NextResponse.json({ error: "Некорректный раздел" }, { status: 400 });
}
