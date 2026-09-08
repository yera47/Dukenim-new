"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeEntitlement } from "@/lib/entitlement";
import { parseDeliveryZone } from "@/lib/delivery-zone";

export type DeliveryState = { error?: string; success?: string };

export async function saveDeliveryZone(_: DeliveryState, form: FormData): Promise<DeliveryState> {
  const parsed = parseDeliveryZone(form);
  if (!parsed.success) return { error: "Укажите название зоны, целую неотрицательную стоимость в тенге и срок до 200 символов." };
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return { error: "Обновите страницу и повторите сохранение." };
  const context = await requireRole(["owner", "superadmin"]);
  if (!context.user || !context.tenantId) return { error: "Для сохранения войдите в аккаунт владельца магазина." };
  try {
    const client = await createClient();
    const tenant = await client.from("tenants").select("plan,next_plan,status,trial_ends_at").eq("id", context.tenantId).single();
    if (tenant.error || !tenant.data || !computeEntitlement(tenant.data).active) return { error: "Нет доступа к настройкам активного магазина." };
    // A scoped lookup + insert/update never reassigns another tenant's zone.
    const current = await client.from("delivery_zones").select("id").eq("tenant_id", context.tenantId).eq("id", id).maybeSingle();
    if (current.error) return { error: "Не удалось прочитать зону. Ваши поля сохранены на экране." };
    const result = current.data
      ? await client.from("delivery_zones").update(parsed.data).eq("tenant_id", context.tenantId).eq("id", id).select("id").maybeSingle()
      : await client.from("delivery_zones").insert({ id, tenant_id: context.tenantId, ...parsed.data }).select("id").single();
    if (result.error || !result.data) return { error: "Не удалось сохранить зону. Обновите данные и повторите." };
    revalidatePath("/admin/settings/delivery");
    revalidatePath("/s/[slug]/checkout", "page");
    return { success: "Зона сохранена. Она появится в оформлении, если доставка включена у магазина." };
  } catch { return { error: "Сервер недоступен. Введённые значения остаются на экране." }; }
}
