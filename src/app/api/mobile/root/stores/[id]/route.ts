import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Магазин не найден" }, { status: 404 });
  const [tenant, products, orders, customers, settings, audit] = await Promise.all([
    root.admin.from("tenants").select("id,name,slug,status,catalog_published,created_at").eq("id", id).maybeSingle(),
    root.admin.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", id),
    root.admin.from("orders").select("id,total,status,payment_status,created_at", { count: "exact" }).eq("tenant_id", id).order("created_at", { ascending: false }).limit(10),
    root.admin.from("customers").select("id", { count: "exact", head: true }).eq("tenant_id", id),
    root.admin.from("tenant_settings").select("delivery_enabled,pickup_enabled,payment_online,payment_provider").eq("tenant_id", id).maybeSingle(),
    root.admin.from("platform_audit_events").select("id,action,reason,created_at").eq("tenant_id", id).order("created_at", { ascending: false }).limit(10),
  ]);
  if (tenant.error || !tenant.data) return NextResponse.json({ error: "Магазин не найден" }, { status: 404 });
  if (products.error || orders.error || customers.error || settings.error || audit.error || products.count === null || orders.count === null || customers.count === null) {
    return NextResponse.json({ error: "Данные магазина загружены не полностью" }, { status: 503 });
  }
  return NextResponse.json({
    store: tenant.data,
    totals: { products: products.count, orders: orders.count, customers: customers.count },
    settings: settings.data,
    recentOrders: orders.data,
    audit: audit.data,
  }, { headers: { "Cache-Control": "no-store" } });
}
