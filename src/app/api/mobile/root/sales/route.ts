import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";
import { FIELD_SALES_STATUSES } from "@/lib/field-sales";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  const zones = await root.admin.from("field_sales_zones").select("id,name").eq("active", true).order("sort_order");
  if (zones.error || !zones.data) return NextResponse.json({ error: "Зоны не загружены." }, { status: 503 });
  const wanted = new URL(request.url).searchParams.get("zone");
  const zoneId = zones.data.find(zone => zone.id === wanted)?.id ?? zones.data[0]?.id;
  if (!zoneId) return NextResponse.json({ zones: [], zoneId: null, leads: [] });
  const leads = await root.admin.from("field_sales_leads")
    .select("id,zone_id,name,address,segment,status,notes,next_action,contact_name,contact_phone,phone,map_url,instagram_url,website_url,whatsapp_url,reminder_at,last_visit_at")
    .eq("zone_id", zoneId).order("priority_score", { ascending: false }).limit(100);
  if (leads.error || !leads.data) return NextResponse.json({ error: "Точки не загружены." }, { status: 503 });
  return NextResponse.json({ zones: zones.data, zoneId, leads: leads.data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  let body: { leadId?: string; status?: string; notes?: string; nextAction?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const leadId = body.leadId ?? "";
  const status = body.status ?? "";
  const notes = body.notes?.trim() ?? "";
  const nextAction = body.nextAction?.trim() ?? "";
  if (!UUID.test(leadId) || !FIELD_SALES_STATUSES.some(item => item.value === status) || notes.length > 10_000 || nextAction.length > 1_000) {
    return NextResponse.json({ error: "Проверьте точку, этап и заметку." }, { status: 400 });
  }
  const previous = await root.admin.from("field_sales_leads").select("status").eq("id", leadId).maybeSingle();
  if (previous.error || !previous.data) return NextResponse.json({ error: "Точка не найдена." }, { status: 404 });
  const saved = await root.admin.from("field_sales_leads").update({ status: status as typeof FIELD_SALES_STATUSES[number]["value"], notes, next_action: nextAction }).eq("id", leadId).select("id").maybeSingle();
  if (saved.error || !saved.data) return NextResponse.json({ error: "Точка не сохранена." }, { status: 409 });
  await root.admin.from("field_sales_activities").insert({ lead_id: leadId, actor_id: root.user.id, event_type: previous.data.status !== status ? "status_changed" : "note", previous_status: previous.data.status, next_status: status as typeof FIELD_SALES_STATUSES[number]["value"], note: notes || nextAction || null });
  return NextResponse.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
}
