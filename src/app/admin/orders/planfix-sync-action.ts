"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncOrderToPlanfix } from "@/lib/integrations/planfix-sync";

const input = z.object({ orderId: z.string().uuid() });
export type PlanfixSyncState = { error?: string; success?: string };

export async function syncOrderToPlanfixAction(_: PlanfixSyncState, form: FormData): Promise<PlanfixSyncState> {
  const context = await getSessionContext();
  if (!context?.user || context.role !== "owner" || !context.tenantId) return { error: "Войдите в аккаунт владельца." };
  const parsed = input.safeParse({ orderId: form.get("orderId") });
  if (!parsed.success) return { error: "Обновите страницу и выберите заказ повторно." };
  try {
    const result = await syncOrderToPlanfix(createAdminClient(), context.tenantId, parsed.data.orderId);
    revalidatePath("/admin/orders");
    revalidatePath("/admin/integrations");
    return result.state === "already_synced"
      ? { success: "Этот заказ уже передан в Planfix — дубль не создан." }
      : { success: "Покупатель и заказ переданы в Planfix." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("not connected") || message.includes("renewed")) return { error: "Переподключите Planfix в разделе интеграций." };
    if (message.includes("checked manually")) return { error: "Ответ Planfix не получен. Проверьте CRM перед повторной отправкой, чтобы не создать дубль." };
    if (message.includes("already running")) return { error: "Отправка уже выполняется. Обновите страницу через минуту." };
    return { error: "Не удалось передать заказ. Данные Dukenim сохранены; попробуйте позже." };
  }
}
