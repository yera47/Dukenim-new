import { NextResponse } from "next/server";
import { requireFieldSalesAccess } from "@/lib/field-sales-access.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { statusLabel } from "@/lib/field-sales";

export const dynamic = "force-dynamic";

const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""').replaceAll(/\r?\n/g, " ")}"`;

export async function GET() {
  await requireFieldSalesAccess();
  const client = createAdminClient();
  const pages = await Promise.all([0, 1000].map((from) => client.from("field_sales_leads").select("*").order("zone_id").order("priority_score", { ascending: false }).range(from, from + 999)));
  const error = pages.find((page) => page.error)?.error;
  if (error) return NextResponse.json({ error: "Выгрузка пока недоступна" }, { status: 503 });
  const rows = pages.flatMap((page) => page.data ?? []);
  const headers = ["Зона","Название","Сегмент","Подсегмент","Адрес","Этап","Приоритет","Телефон","Контакт","Телефон контакта","Instagram","Сайт","2ГИС","Что обсудили","Следующий шаг","Напомнить","Последний визит","Дата маршрута","Порядок"];
  const lines = rows.map((lead) => [lead.zone_id,lead.name,lead.segment,lead.subsegment,lead.address,statusLabel(lead.status),lead.priority_score,lead.phone,lead.contact_name,lead.contact_phone,lead.instagram_url,lead.website_url,lead.map_url,lead.notes,lead.next_action,lead.reminder_at,lead.last_visit_at,lead.route_day,lead.route_position].map(csv).join(";"));
  const body = `\uFEFF${headers.map(csv).join(";")}\r\n${lines.join("\r\n")}`;
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="dukenim-field-sales-${new Date().toISOString().slice(0,10)}.csv"`, "Cache-Control": "private, no-store" } });
}
