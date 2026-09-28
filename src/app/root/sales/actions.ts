"use server";

import { revalidatePath } from "next/cache";
import { requireFieldSalesAccess } from "@/lib/field-sales-access.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FIELD_SALES_STATUSES, safeExternalUrl, type FieldSalesStatus } from "@/lib/field-sales";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function rootClient() {
  const context = await requireFieldSalesAccess();
  return { client: createAdminClient(), actorId: context.user!.id };
}

const optionalUrl = (value: FormDataEntryValue | null) => {
  const input = String(value ?? "").trim();
  if (!input) return "";
  const normalized = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  if (!safeExternalUrl(normalized)) throw new Error("Проверьте ссылку: разрешены только http и https.");
  return normalized;
};

export async function updateFieldSalesLead(form: FormData) {
  const { client } = await rootClient();
  const leadId = String(form.get("leadId") ?? "");
  const status = String(form.get("status") ?? "");
  const reminderRaw = String(form.get("reminderAt") ?? "").trim();
  if (!UUID.test(leadId) || !FIELD_SALES_STATUSES.some((item) => item.value === status)) throw new Error("Проверьте точку и этап переговоров.");
  const notes = String(form.get("notes") ?? "").trim();
  const nextAction = String(form.get("nextAction") ?? "").trim();
  if (notes.length > 10_000 || nextAction.length > 1_000) throw new Error("Заметка или следующий шаг слишком длинные.");
  const rpc = client as unknown as { rpc: (name: "update_field_sales_lead", args: Record<string, unknown>) => Promise<{ data: boolean | null; error: { message: string } | null }> };
  const result = await rpc.rpc("update_field_sales_lead", {
    p_lead: leadId,
    p_status: status,
    p_contact_name: String(form.get("contactName") ?? "").trim(),
    p_contact_role: String(form.get("contactRole") ?? "").trim(),
    p_contact_phone: String(form.get("contactPhone") ?? "").trim(),
    p_phone: String(form.get("phone") ?? "").trim(),
    p_instagram_url: optionalUrl(form.get("instagramUrl")),
    p_website_url: optionalUrl(form.get("websiteUrl")),
    p_notes: notes,
    p_next_action: nextAction,
    p_reminder_at: reminderRaw ? new Date(reminderRaw).toISOString() : null,
    p_mark_visit: form.get("markVisit") === "1",
  });
  if (result.error || !result.data) throw new Error(result.error?.message ?? "Точка не обновлена.");
  revalidatePath("/root/sales");
  revalidatePath("/admin/sales");
}

export async function createFieldSalesLead(form: FormData) {
  const { client, actorId } = await rootClient();
  const name = String(form.get("name") ?? "").trim();
  const zoneId = String(form.get("zoneId") ?? "");
  const longitudeRaw = String(form.get("longitude") ?? "").trim();
  const latitudeRaw = String(form.get("latitude") ?? "").trim();
  if (name.length < 2 || name.length > 240 || !/^Z\d+$/.test(zoneId)) throw new Error("Укажите название и зону.");
  const insert = await client.from("field_sales_leads").insert({
    external_source: "manual",
    external_id: crypto.randomUUID(),
    zone_id: zoneId,
    name,
    address: String(form.get("address") ?? "").trim(),
    segment: String(form.get("segment") ?? "Другое").trim() || "Другое",
    subsegment: String(form.get("subsegment") ?? "").trim(),
    longitude: longitudeRaw ? Number(longitudeRaw) : null,
    latitude: latitudeRaw ? Number(latitudeRaw) : null,
    phone: String(form.get("phone") ?? "").trim() || null,
    instagram_url: optionalUrl(form.get("instagramUrl")) || null,
    website_url: optionalUrl(form.get("websiteUrl")) || null,
    map_url: optionalUrl(form.get("mapUrl")) || null,
    priority_score: 60,
    priority: "B — добавлено вручную",
  }).select("id").single();
  if (insert.error || !insert.data) throw new Error("Не удалось добавить заведение.");
  await client.from("field_sales_activities").insert({ lead_id: insert.data.id, actor_id: actorId, event_type: "created", note: "Добавлено вручную" });
  revalidatePath("/root/sales");
  revalidatePath("/admin/sales");
}

export async function saveFieldSalesRoute(form: FormData) {
  const { client } = await rootClient();
  const zone = String(form.get("zone") ?? "");
  const day = String(form.get("day") ?? "");
  let ids: string[] = [];
  try { ids = JSON.parse(String(form.get("leadIds") ?? "[]")); } catch { throw new Error("Маршрут повреждён."); }
  if (!/^Z\d+$/.test(zone) || !/^\d{4}-\d{2}-\d{2}$/.test(day) || ids.length < 1 || ids.length > 30 || ids.some((id) => !UUID.test(id))) throw new Error("Проверьте дату и точки маршрута.");
  const rpc = client as unknown as { rpc: (name: "plan_field_sales_route", args: Record<string, unknown>) => Promise<{ data: number | null; error: { message: string } | null }> };
  const result = await rpc.rpc("plan_field_sales_route", { p_zone: zone, p_day: day, p_leads: ids });
  if (result.error || !result.data) throw new Error(result.error?.message ?? "Маршрут не сохранён.");
  revalidatePath("/root/sales");
  revalidatePath("/admin/sales");
}

const refreshSales = () => {
  revalidatePath("/root/sales");
  revalidatePath("/admin/sales");
};

export async function startFieldSalesTrip(form: FormData) {
  const { client, actorId } = await rootClient();
  const zoneId = String(form.get("zoneId") ?? "");
  let leadIds: string[] = [];
  try { leadIds = JSON.parse(String(form.get("leadIds") ?? "[]")); } catch { throw new Error("Маршрут повреждён."); }
  if (!/^Z\d{3}$/.test(zoneId) || leadIds.length < 1 || leadIds.length > 20 || leadIds.some((id) => !UUID.test(id))) throw new Error("Проверьте зону и маршрут.");
  // New private trip tables are intentionally absent from the public generated client surface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = client as any;
  const existing = await admin.from("field_sales_trips" as never).select("id" as never).eq("actor_id" as never, actorId as never).eq("status" as never, "active" as never).maybeSingle();
  if (existing.data) throw new Error("Сначала завершите текущую поездку.");
  const trip = await admin.from("field_sales_trips" as never).insert({ zone_id: zoneId, actor_id: actorId, status: "active" } as never).select("id" as never).single();
  if (trip.error || !trip.data) throw new Error("Не удалось начать поездку.");
  const tripId = (trip.data as unknown as { id: string }).id;
  const stops = leadIds.map((leadId, index) => ({ trip_id: tripId, lead_id: leadId, position: index + 1, state: index === 0 ? "current" : "queued", opened_at: index === 0 ? new Date().toISOString() : null }));
  const inserted = await admin.from("field_sales_trip_stops" as never).insert(stops as never);
  if (inserted.error) {
    await admin.from("field_sales_trips" as never).delete().eq("id" as never, tripId as never);
    throw new Error("Не удалось сохранить остановки поездки.");
  }
  await admin.from("field_sales_leads").update({ status: "planned" }).in("id", leadIds).eq("status", "new");
  refreshSales();
}

const OUTCOME_STATUS: Record<string, FieldSalesStatus> = { interested: "negotiating", follow_up: "follow_up", not_available: "follow_up", refused: "lost", connected: "won" };

export async function completeFieldSalesStop(form: FormData) {
  const { client, actorId } = await rootClient();
  const stopId = String(form.get("stopId") ?? "");
  const outcome = String(form.get("outcome") ?? "");
  const feedback = String(form.get("feedback") ?? "").trim();
  const reminderRaw = String(form.get("reminderAt") ?? "").trim();
  if (!UUID.test(stopId) || !OUTCOME_STATUS[outcome] || feedback.length > 4000) throw new Error("Выберите итог встречи и проверьте комментарий.");
  // New private trip tables are intentionally absent from the public generated client surface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = client as any;
  const stopResult = await admin.from("field_sales_trip_stops" as never).select("id,trip_id,lead_id,position,state" as never).eq("id" as never, stopId as never).maybeSingle();
  const stop = stopResult.data as unknown as { id: string; trip_id: string; lead_id: string; position: number; state: string } | null;
  if (!stop || stop.state !== "current") throw new Error("Эта остановка уже закрыта.");
  const tripResult = await admin.from("field_sales_trips" as never).select("id,actor_id,status" as never).eq("id" as never, stop.trip_id as never).maybeSingle();
  const trip = tripResult.data as unknown as { id: string; actor_id: string | null; status: string } | null;
  if (!trip || trip.actor_id !== actorId || trip.status !== "active") throw new Error("Поездка уже завершена.");

  const now = new Date().toISOString();
  await admin.from("field_sales_trip_stops" as never).update({ state: outcome === "not_available" ? "skipped" : "completed", outcome, feedback, completed_at: now } as never).eq("id" as never, stop.id as never);
  await admin.from("field_sales_leads").update({ status: OUTCOME_STATUS[outcome], last_visit_at: now, notes: feedback, next_action: outcome === "follow_up" || outcome === "not_available" ? "Вернуться по договорённости" : "", reminder_at: reminderRaw ? new Date(reminderRaw).toISOString() : null }).eq("id", stop.lead_id);
  await admin.from("field_sales_activities").insert({ lead_id: stop.lead_id, actor_id: actorId, event_type: "visit", next_status: OUTCOME_STATUS[outcome], note: feedback || outcome });
  const nextResult = await admin.from("field_sales_trip_stops" as never).select("id" as never).eq("trip_id" as never, stop.trip_id as never).eq("state" as never, "queued" as never).order("position" as never, { ascending: true }).limit(1).maybeSingle();
  if (nextResult.data) {
    const nextId = (nextResult.data as unknown as { id: string }).id;
    await admin.from("field_sales_trip_stops" as never).update({ state: "current", opened_at: now } as never).eq("id" as never, nextId as never);
  } else {
    await admin.from("field_sales_trips" as never).update({ status: "completed", completed_at: now } as never).eq("id" as never, stop.trip_id as never);
  }
  refreshSales();
}

export async function cancelFieldSalesTrip(form: FormData) {
  const { client, actorId } = await rootClient();
  const tripId = String(form.get("tripId") ?? "");
  if (!UUID.test(tripId)) throw new Error("Поездка не найдена.");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = client as any;
  const result = await admin.from("field_sales_trips").update({ status: "cancelled", completed_at: new Date().toISOString() }).eq("id", tripId).eq("actor_id", actorId).eq("status", "active").select("id").maybeSingle();
  if (!result.data) throw new Error("Поездка уже завершена.");
  const pendingStops = await admin.from("field_sales_trip_stops").select("lead_id").eq("trip_id", tripId).in("state", ["queued", "current"]);
  if (pendingStops.error) throw pendingStops.error;
  const pendingLeadIds = (pendingStops.data ?? []).map((stop: { lead_id: string }) => stop.lead_id);
  await admin.from("field_sales_trip_stops").update({ state: "skipped", completed_at: new Date().toISOString() }).eq("trip_id", tripId).in("state", ["queued", "current"]);
  if (pendingLeadIds.length > 0) {
    await admin.from("field_sales_leads").update({ status: "new" }).in("id", pendingLeadIds).eq("status", "planned");
  }
  refreshSales();
}
