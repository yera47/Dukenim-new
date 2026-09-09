import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OrderRow } from "@/types/database";

export type SalesOrder = Pick<OrderRow, "id" | "created_at" | "source" | "status" | "payment_status" | "total">;
const DAY = 86400000;
export function salesPeriod(days: 1 | 7 | 30, now = new Date()) {
  const today = new Date(now.getTime() + 5 * 3600000).toISOString().slice(0, 10);
  const startToday = Date.parse(`${today}T00:00:00+05:00`);
  const start = new Date(startToday - (days - 1) * DAY).toISOString();
  const labels = Array.from({ length: days }, (_, i) => new Date(startToday - (days - 1 - i) * DAY + 5 * 3600000).toISOString().slice(0, 10));
  return { start, end: now.toISOString(), labels };
}
export function summarizeSales(orders: SalesOrder[], labels: string[]) {
  const buckets = new Map(labels.map(day => [day, 0]));
  let online = 0, offline = 0, count = 0;
  for (const order of orders) {
    if (order.payment_status !== "paid" || order.status === "cancelled") continue;
    const day = new Date(Date.parse(order.created_at) + 5 * 3600000).toISOString().slice(0, 10);
    if (!buckets.has(day)) continue;
    if (!Number.isSafeInteger(order.total) || order.total < 0) throw new Error("Некорректная сумма заказа.");
    if (order.source === "online") online += order.total; else offline += order.total;
    if (!Number.isSafeInteger(online + offline)) throw new Error("Сумма превышает точность расчёта.");
    count++;
    buckets.set(day, buckets.get(day)! + order.total);
  }
  return { online, offline, total: online + offline, count, days: Array.from(buckets, ([day, total]) => ({ day, total })) };
}
export async function loadSalesPeriod(client: SupabaseClient<Database>, tenantId: string, period: ReturnType<typeof salesPeriod>) {
  const orders: SalesOrder[] = [];
  let cursor: string | undefined;
  // Stable keyset paging, not the order feed's last 100 entries. RLS remains active.
  for (let page = 0; page < 100; page++) {
    let query = client.from("orders").select("id,created_at,source,status,payment_status,total")
      .eq("tenant_id", tenantId).gte("created_at", period.start).lte("created_at", period.end)
      .order("id", { ascending: true }).limit(1000);
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query;
    if (error || !data) throw new Error("Не удалось загрузить продажи.");
    if (!data.length) return summarizeSales(orders, period.labels);
    orders.push(...data);
    cursor = data[data.length - 1].id;
  }
  // Never display a silently truncated total.
  throw new Error("Для этого объёма заказов нужен расширенный отчёт.");
}
