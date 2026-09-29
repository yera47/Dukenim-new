import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";
import { FIELD_SALES_REMINDER_TYPES, parseLocalDateTime, type FieldSalesStatus } from "@/lib/field-sales";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OUTCOME_STATUS: Record<string, FieldSalesStatus> = { interested: "negotiating", follow_up: "follow_up", not_available: "follow_up", refused: "lost", connected: "won" };
const noStore = { "Cache-Control": "no-store, private" };

function dayBounds(now: Date) {
  const local = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return { start: new Date(`${local}T00:00:00+05:00`).toISOString(), end: new Date(`${local}T23:59:59.999+05:00`).toISOString() };
}

export async function GET(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  // These tables are server-only and intentionally excluded from the public generated client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = root.admin as any;
  const bounds = dayBounds(new Date());
  const [activeResult, historyResult, agendaResult, dueResult] = await Promise.all([
    admin.from("field_sales_trips").select("id,zone_id,status,started_at,completed_at").eq("actor_id", root.user.id).eq("status", "active").maybeSingle(),
    admin.from("field_sales_trips").select("id,zone_id,status,started_at,completed_at").eq("actor_id", root.user.id).neq("status", "active").order("started_at", { ascending: false }).limit(8),
    root.admin.from("field_sales_leads").select("id,zone_id,name,address,segment,status,next_action,reminder_at,reminder_type").not("reminder_at", "is", null).is("reminder_completed_at", null).gte("reminder_at", bounds.start).lte("reminder_at", bounds.end).order("reminder_at").limit(100),
    root.admin.from("field_sales_leads").select("id", { count: "exact", head: true }).not("reminder_at", "is", null).is("reminder_completed_at", null).lte("reminder_at", new Date().toISOString()).not("status", "in", "(won,lost,do_not_contact)"),
  ]);
  if (activeResult.error || historyResult.error || agendaResult.error || dueResult.error) return NextResponse.json({ error: "Не удалось загрузить поездки и напоминания." }, { status: 503, headers: noStore });
  const activeTrip = activeResult.data;
  let stops: unknown[] = [];
  if (activeTrip) {
    const stopResult = await admin.from("field_sales_trip_stops").select("id,trip_id,lead_id,position,state,outcome,feedback,opened_at,completed_at,lead:field_sales_leads(id,name,address,segment,phone,map_url,instagram_url,website_url,whatsapp_url)").eq("trip_id", activeTrip.id).order("position");
    if (stopResult.error || !stopResult.data) return NextResponse.json({ error: "Остановки активной поездки не загружены." }, { status: 503, headers: noStore });
    stops = stopResult.data;
  }
  return NextResponse.json({ activeTrip, stops, history: historyResult.data ?? [], agenda: agendaResult.data ?? [], dueCount: dueResult.count ?? 0 }, { headers: noStore });
}

export async function POST(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  // These tables are server-only and intentionally excluded from the public generated client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = root.admin as any;
  const action = body.action;

  if (action === "start") {
    const zoneId = typeof body.zoneId === "string" ? body.zoneId : "";
    const leadIds = Array.isArray(body.leadIds) ? body.leadIds : [];
    if (!/^Z\d{3}$/.test(zoneId) || leadIds.length < 1 || leadIds.length > 20 || leadIds.some(id => typeof id !== "string" || !UUID.test(id)) || new Set(leadIds).size !== leadIds.length) return NextResponse.json({ error: "Проверьте зону и список из 1–20 уникальных точек." }, { status: 400 });
    const [zoneResult, existing, leadResult] = await Promise.all([
      root.admin.from("field_sales_zones").select("id").eq("id", zoneId).eq("active", true).maybeSingle(),
      admin.from("field_sales_trips").select("id").eq("actor_id", root.user.id).eq("status", "active").maybeSingle(),
      root.admin.from("field_sales_leads").select("id,status").eq("zone_id", zoneId).in("id", leadIds),
    ]);
    if (zoneResult.error || leadResult.error) return NextResponse.json({ error: "Не удалось проверить маршрут." }, { status: 503 });
    if (!zoneResult.data || leadResult.data?.length !== leadIds.length || leadResult.data.some(row => ["won", "lost", "do_not_contact"].includes(row.status))) return NextResponse.json({ error: "В маршруте есть недоступная или уже закрытая точка." }, { status: 409 });
    if (existing.error) return NextResponse.json({ error: "Не удалось проверить активную поездку." }, { status: 503 });
    if (existing.data) return NextResponse.json({ error: "Сначала завершите текущую поездку." }, { status: 409 });
    const now = new Date().toISOString();
    const tripResult = await admin.from("field_sales_trips").insert({ zone_id: zoneId, actor_id: root.user.id, status: "active" }).select("id").single();
    if (tripResult.error || !tripResult.data) return NextResponse.json({ error: "Не удалось начать поездку." }, { status: 409 });
    const tripId = tripResult.data.id as string;
    const inserted = await admin.from("field_sales_trip_stops").insert(leadIds.map((leadId, index) => ({ trip_id: tripId, lead_id: leadId, position: index + 1, state: index === 0 ? "current" : "queued", opened_at: index === 0 ? now : null })));
    if (inserted.error) {
      await admin.from("field_sales_trips").delete().eq("id", tripId).eq("actor_id", root.user.id);
      return NextResponse.json({ error: "Не удалось сохранить точки маршрута." }, { status: 409 });
    }
    const planned = await root.admin.from("field_sales_leads").update({ status: "planned" }).in("id", leadIds).eq("status", "new");
    if (planned.error) {
      await admin.from("field_sales_trips").delete().eq("id", tripId).eq("actor_id", root.user.id);
      return NextResponse.json({ error: "Не удалось обновить этапы точек; запуск поездки отменён." }, { status: 503 });
    }
    return NextResponse.json({ saved: true, tripId }, { headers: noStore });
  }

  if (action === "complete_stop") {
    const stopId = typeof body.stopId === "string" ? body.stopId : "";
    const outcome = typeof body.outcome === "string" ? body.outcome : "";
    const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
    const hasReminderAt = typeof body.reminderAt === "string";
    const reminderAt = hasReminderAt ? (body.reminderAt as string).trim() : "";
    const reminderType = typeof body.reminderType === "string" ? body.reminderType : "task";
    if (!UUID.test(stopId) || !OUTCOME_STATUS[outcome] || feedback.length > 4000 || !FIELD_SALES_REMINDER_TYPES.some(item => item.value === reminderType)) return NextResponse.json({ error: "Выберите итог встречи и проверьте заметку." }, { status: 400 });
    let reminder: string | null;
    try { reminder = parseLocalDateTime(reminderAt); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Проверьте дату напоминания." }, { status: 400 }); }
    const stopResult = await admin.from("field_sales_trip_stops").select("id,trip_id,lead_id,state").eq("id", stopId).maybeSingle();
    const stop = stopResult.data as { id: string; trip_id: string; lead_id: string; state: string } | null;
    if (stopResult.error) return NextResponse.json({ error: "Не удалось проверить остановку." }, { status: 503 });
    if (!stop || stop.state !== "current") return NextResponse.json({ error: "Эта остановка уже закрыта." }, { status: 409 });
    const tripResult = await admin.from("field_sales_trips").select("id,actor_id,status").eq("id", stop.trip_id).maybeSingle();
    if (tripResult.error) return NextResponse.json({ error: "Не удалось проверить поездку." }, { status: 503 });
    if (!tripResult.data || tripResult.data.actor_id !== root.user.id || tripResult.data.status !== "active") return NextResponse.json({ error: "Поездка уже завершена или вам не принадлежит." }, { status: 409 });
    const now = new Date().toISOString();
    const nextStatus = OUTCOME_STATUS[outcome];
    const stopUpdate = await admin.from("field_sales_trip_stops").update({ state: outcome === "not_available" ? "skipped" : "completed", outcome, feedback, completed_at: now }).eq("id", stop.id).eq("state", "current").select("id").maybeSingle();
    if (stopUpdate.error || !stopUpdate.data) return NextResponse.json({ error: "Остановка изменилась. Обновите поездку." }, { status: 409 });
    const leadUpdate = await root.admin.from("field_sales_leads").update({ status: nextStatus, last_visit_at: now, notes: feedback, next_action: outcome === "follow_up" || outcome === "not_available" ? "Вернуться по договорённости" : "", ...(hasReminderAt ? { reminder_at: reminder, reminder_type: reminderType as "call" | "meeting" | "task", reminder_completed_at: null } : {}) }).eq("id", stop.lead_id).select("id").maybeSingle();
    if (leadUpdate.error || !leadUpdate.data) return NextResponse.json({ error: "Итог поездки сохранён, но карточка точки не обновилась. Обновите экран." }, { status: 503 });
    const activity = await root.admin.from("field_sales_activities").insert({ lead_id: stop.lead_id, actor_id: root.user.id, event_type: "visit", next_status: nextStatus, note: feedback || outcome });
    if (activity.error) return NextResponse.json({ error: "Итог сохранён, но журнал не обновился. Сообщите администратору." }, { status: 503 });
    const nextResult = await admin.from("field_sales_trip_stops").select("id").eq("trip_id", stop.trip_id).eq("state", "queued").order("position").limit(1).maybeSingle();
    if (nextResult.error) return NextResponse.json({ error: "Итог сохранён, следующая точка не открылась. Обновите поездку." }, { status: 503 });
    if (nextResult.data) {
      const advanced = await admin.from("field_sales_trip_stops").update({ state: "current", opened_at: now }).eq("id", nextResult.data.id).eq("state", "queued").select("id").maybeSingle();
      if (advanced.error || !advanced.data) return NextResponse.json({ error: "Итог сохранён, следующая точка не открылась. Обновите поездку." }, { status: 503 });
    } else {
      const completed = await admin.from("field_sales_trips").update({ status: "completed", completed_at: now }).eq("id", stop.trip_id).eq("actor_id", root.user.id).eq("status", "active").select("id").maybeSingle();
      if (completed.error || !completed.data) return NextResponse.json({ error: "Все точки обработаны, но статус поездки не обновился. Обновите поездку." }, { status: 503 });
    }
    return NextResponse.json({ saved: true, completed: !nextResult.data }, { headers: noStore });
  }

  if (action === "finish") {
    const tripId = typeof body.tripId === "string" ? body.tripId : "";
    if (!UUID.test(tripId)) return NextResponse.json({ error: "Поездка не найдена." }, { status: 400 });
    const trip = await admin.from("field_sales_trips").update({ status: "cancelled", completed_at: new Date().toISOString() }).eq("id", tripId).eq("actor_id", root.user.id).eq("status", "active").select("id").maybeSingle();
    if (trip.error) return NextResponse.json({ error: "Не удалось завершить поездку." }, { status: 503 });
    if (!trip.data) return NextResponse.json({ error: "Поездка уже завершена." }, { status: 409 });
    const pending = await admin.from("field_sales_trip_stops").select("lead_id").eq("trip_id", tripId).in("state", ["queued", "current"]);
    if (pending.error) return NextResponse.json({ error: "Поездка остановлена, но список точек не обновлён." }, { status: 503 });
    const ids = (pending.data ?? []).map((item: { lead_id: string }) => item.lead_id);
    const stops = await admin.from("field_sales_trip_stops").update({ state: "skipped", completed_at: new Date().toISOString() }).eq("trip_id", tripId).in("state", ["queued", "current"]);
    if (stops.error) return NextResponse.json({ error: "Поездка остановлена, но точки не обновлены." }, { status: 503 });
    if (ids.length) {
      const leads = await root.admin.from("field_sales_leads").update({ status: "new" }).in("id", ids).eq("status", "planned");
      if (leads.error) return NextResponse.json({ error: "Поездка остановлена, этапы оставшихся точек не обновлены." }, { status: 503 });
    }
    return NextResponse.json({ saved: true }, { headers: noStore });
  }

  if (action === "complete_reminder") {
    const leadId = typeof body.leadId === "string" ? body.leadId : "";
    if (!UUID.test(leadId)) return NextResponse.json({ error: "Задача не найдена." }, { status: 400 });
    const result = await root.admin.from("field_sales_leads").update({ reminder_completed_at: new Date().toISOString() }).eq("id", leadId).not("reminder_at", "is", null).is("reminder_completed_at", null).select("id").maybeSingle();
    if (result.error) return NextResponse.json({ error: "Не удалось закрыть напоминание." }, { status: 503 });
    if (!result.data) return NextResponse.json({ error: "Напоминание уже закрыто или не найдено." }, { status: 409 });
    const activity = await root.admin.from("field_sales_activities").insert({ lead_id: leadId, actor_id: root.user.id, event_type: "reminder", note: "Задача выполнена" });
    if (activity.error) return NextResponse.json({ error: "Напоминание закрыто, но журнал не обновился." }, { status: 503 });
    return NextResponse.json({ saved: true }, { headers: noStore });
  }

  return NextResponse.json({ error: "Неизвестное действие." }, { status: 400 });
}
