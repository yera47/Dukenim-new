"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FIELD_SALES_STATUSES, safeExternalUrl } from "@/lib/field-sales";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function rootClient() {
  const context = await requireRole(["superadmin"]);
  if (!context.user) throw new Error("Требуется вход владельца платформы.");
  return { client: await createClient(), actorId: context.user.id };
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
}
