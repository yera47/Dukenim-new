"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isIntegrationProvider } from "@/lib/integrations/providers";
import type { Database } from "@/types/database";

const directions = new Set(["orders_and_customers", "orders_only", "stock_and_products", "consultation"]);

export async function saveCrmIntegrationRequest(formData: FormData) {
  const { tenantId } = await requireRole(["owner"]);
  const intent = String(formData.get("intent") ?? "submit");
  const provider = String(formData.get("provider") ?? "");
  const accountUrl = String(formData.get("accountUrl") ?? "").trim();
  const adminContact = String(formData.get("adminContact") ?? "").trim();
  const syncDirection = String(formData.get("syncDirection") ?? "orders_and_customers");
  const notes = String(formData.get("notes") ?? "").trim();

  if (intent !== "submit" && intent !== "later") throw new Error("Выберите корректное действие.");
  if (!isIntegrationProvider(provider)) throw new Error("Выберите систему из списка.");
  if (!directions.has(syncDirection)) throw new Error("Выберите корректное направление синхронизации.");
  if (accountUrl.length > 300 || adminContact.length > 160 || notes.length > 1200) throw new Error("Сократите данные заявки и попробуйте снова.");
  if (accountUrl) {
    try {
      const parsedAccountUrl = new URL(accountUrl);
      if (parsedAccountUrl.protocol !== "https:" && parsedAccountUrl.protocol !== "http:") throw new Error();
    } catch {
      throw new Error("Укажите корректную ссылку на аккаунт.");
    }
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const client = await createClient();
    const status = intent === "later" ? "details_later" : accountUrl && adminContact ? "submitted" : "credentials_needed";
    const { error } = await client.from("crm_integration_requests").upsert({
      tenant_id: tenantId!,
      provider: provider as Database["public"]["Tables"]["crm_integration_requests"]["Row"]["provider"],
      account_url: accountUrl || null,
      admin_contact: adminContact || null,
      sync_direction: syncDirection as Database["public"]["Tables"]["crm_integration_requests"]["Row"]["sync_direction"],
      notes: notes || null,
      status,
      submitted_at: status === "submitted" ? new Date().toISOString() : null,
      last_status_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,provider" });
    if (error) throw new Error("Не удалось сохранить заявку. Попробуйте ещё раз.");
  }

  revalidatePath("/admin/integrations");
  revalidatePath("/admin");
}
