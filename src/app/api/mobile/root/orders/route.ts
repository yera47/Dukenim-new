import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";

const allowed = new Set(["new", "confirmed", "assembled", "delivering", "done", "cancelled"]);

export async function GET(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim().toLowerCase().slice(0, 120) ?? "";
  const status = params.get("status") ?? "";
  if (status && !allowed.has(status)) return NextResponse.json({ error: "Некорректный фильтр" }, { status: 400 });
  const [orders, tenants] = await Promise.all([
    root.admin.from("orders").select("id,tenant_id,order_number,status,payment_status,total,created_at,delivery_method", { count: "exact" }).order("created_at", { ascending: false }).limit(500),
    root.admin.from("tenants").select("id,name,slug"),
  ]);
  if (orders.error || tenants.error || !orders.data || !tenants.data || orders.count === null) {
    return NextResponse.json({ error: "Не удалось полностью загрузить заказы" }, { status: 503 });
  }
  const names = new Map(tenants.data.map(tenant => [tenant.id, tenant]));
  const visible = orders.data.filter(order => {
    const tenant = names.get(order.tenant_id);
    return (!status || order.status === status) && (!q || String(order.order_number ?? "").includes(q) || order.id.includes(q) || tenant?.name.toLowerCase().includes(q) || tenant?.slug.includes(q));
  }).map(order => ({ ...order, storeName: names.get(order.tenant_id)?.name ?? "Магазин удалён" }));
  return NextResponse.json({ orders: visible, possiblyMore: orders.count > 500 }, { headers: { "Cache-Control": "no-store, private" } });
}
