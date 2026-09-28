import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";
import { FIELD_SALES_TENANT_SLUG } from "@/lib/field-sales-access";

export async function GET(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  const [stores, orders, requests] = await Promise.all([
    root.admin.from("tenants").select("id,name,slug,status,catalog_published,created_at", { count: "exact" }).order("created_at", { ascending: false }).range(0, 499),
    root.admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
    root.admin.from("change_requests").select("id", { count: "exact", head: true }).neq("status", "done"),
  ]);
  if (stores.error || orders.error || requests.error || stores.count === null || orders.count === null || requests.count === null || stores.count > 500) {
    return NextResponse.json({ error: "Не удалось полностью загрузить данные платформы." }, { status: 503 });
  }
  return NextResponse.json({
    stores: stores.data.map(store => ({
      ...store,
      bulkDeletable: store.slug !== FIELD_SALES_TENANT_SLUG,
      bulkDeleteBlockReason: store.slug === FIELD_SALES_TENANT_SLUG ? "Внутренний магазин Dukenim защищён" : null,
    })),
    totals: { stores: stores.count, newOrders: orders.count, openRequests: requests.count },
  }, { headers: { "Cache-Control": "no-store" } });
}
