import type { Database } from "@/types/database";

export type FieldSalesLead = Database["public"]["Tables"]["field_sales_leads"]["Row"];
export type FieldSalesStatus = FieldSalesLead["status"];
export type FieldSalesReminderType = FieldSalesLead["reminder_type"];

export const FIELD_SALES_REMINDER_TYPES: ReadonlyArray<{ value: FieldSalesReminderType; label: string }> = [
  { value: "call", label: "Звонок" },
  { value: "meeting", label: "Встреча" },
  { value: "task", label: "Задача" },
];

export const reminderTypeLabel = (type: string) => FIELD_SALES_REMINDER_TYPES.find((item) => item.value === type)?.label ?? "Задача";

export function parseLocalDateTime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Проверьте дату и время напоминания.");
  return date.toISOString();
}

export function fieldSalesReturnPath(value: FormDataEntryValue | null, leadId?: string) {
  const raw = String(value ?? "");
  const allowed = raw.startsWith("/root/sales?") || raw.startsWith("/admin/sales?") || raw === "/root/sales" || raw === "/admin/sales";
  const base = allowed ? raw.split("#")[0] : "/root/sales";
  return leadId ? `${base}#lead-${leadId}` : base;
}

export const FIELD_SALES_STATUSES: ReadonlyArray<{ value: FieldSalesStatus; label: string; tone: string }> = [
  { value: "new", label: "Новая точка", tone: "slate" },
  { value: "planned", label: "В маршрут", tone: "blue" },
  { value: "contacted", label: "Связались", tone: "violet" },
  { value: "negotiating", label: "Переговоры", tone: "amber" },
  { value: "demo", label: "Показываем Dukenim", tone: "orange" },
  { value: "follow_up", label: "Нужно вернуться", tone: "pink" },
  { value: "won", label: "Подключён", tone: "green" },
  { value: "lost", label: "Отказ", tone: "red" },
  { value: "do_not_contact", label: "Не беспокоить", tone: "gray" },
];

export const statusLabel = (status: string) => FIELD_SALES_STATUSES.find((item) => item.value === status)?.label ?? status;

export function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function distance(a: FieldSalesLead, b: FieldSalesLead) {
  const latA = Number(a.latitude ?? 0) * Math.PI / 180;
  const latB = Number(b.latitude ?? 0) * Math.PI / 180;
  const dLat = latB - latA;
  const dLon = (Number(b.longitude ?? 0) - Number(a.longitude ?? 0)) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const pathLength = (items: FieldSalesLead[]) => items.slice(1).reduce((total, item, index) => total + distance(items[index], item), 0);

/** A deterministic nearest-neighbour route with a bounded 2-opt pass. */
export function buildVisitRoute(leads: FieldSalesLead[], limit = 12) {
  const candidates = leads
    .filter((lead) => lead.latitude !== null && lead.longitude !== null && !["won", "lost", "do_not_contact"].includes(lead.status))
    .sort((a, b) => b.priority_score - a.priority_score || b.review_count - a.review_count)
    .slice(0, Math.max(1, Math.min(30, limit)));
  if (candidates.length < 2) return candidates;

  const start = candidates.reduce((best, item) => Number(item.latitude) > Number(best.latitude) || (item.latitude === best.latitude && Number(item.longitude) < Number(best.longitude)) ? item : best);
  const remaining = candidates.filter((item) => item.id !== start.id);
  const route = [start];
  while (remaining.length) {
    const current = route.at(-1)!;
    let nextIndex = 0;
    for (let index = 1; index < remaining.length; index += 1) if (distance(current, remaining[index]) < distance(current, remaining[nextIndex])) nextIndex = index;
    route.push(remaining.splice(nextIndex, 1)[0]);
  }

  let improved = true;
  for (let pass = 0; pass < 4 && improved; pass += 1) {
    improved = false;
    for (let from = 1; from < route.length - 2; from += 1) {
      for (let to = from + 1; to < route.length - 1; to += 1) {
        const candidate = [...route.slice(0, from), ...route.slice(from, to + 1).reverse(), ...route.slice(to + 1)];
        if (pathLength(candidate) + 0.001 < pathLength(route)) {
          route.splice(0, route.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return route;
}

export function routeLengthKm(items: FieldSalesLead[]) {
  return pathLength(items);
}

