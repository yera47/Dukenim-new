import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Некорректный заказ" }, { status: 400 });
  const orderResult = await root.admin.from("orders").select("id,tenant_id,customer_id,order_number,created_at,status,payment_status,payment_method,delivery_method,delivery_address,subtotal,delivery_cost,total,source").eq("id", id).maybeSingle();
  if (orderResult.error) return NextResponse.json({ error: "Не удалось загрузить заказ" }, { status: 503 });
  const order = orderResult.data;
  if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  const [store, customer, items, movements] = await Promise.all([
    root.admin.from("tenants").select("id,name,slug").eq("id", order.tenant_id).maybeSingle(),
    order.customer_id ? root.admin.from("customers").select("name,phone").eq("id", order.customer_id).eq("tenant_id", order.tenant_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    root.admin.from("order_items").select("title_snapshot,price_snapshot,qty,options_snapshot").eq("order_id", id).eq("tenant_id", order.tenant_id),
    root.admin.from("stock_movements").select("delta,reason,created_at").eq("order_id", id).eq("tenant_id", order.tenant_id),
  ]);
  if (store.error || customer.error || items.error || movements.error || !store.data || !items.data || !movements.data) {
    return NextResponse.json({ error: "Не удалось полностью загрузить детали заказа" }, { status: 503 });
  }
  return NextResponse.json({ order, store: store.data, customer: customer.data, items: items.data, movements: movements.data }, { headers: { "Cache-Control": "no-store, private" } });
}
