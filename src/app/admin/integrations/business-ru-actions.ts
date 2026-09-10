"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BusinessRuApiError,
  normalizeBusinessRuAccountDomain,
  probeBusinessRuConnection,
  validateBusinessRuCredentials,
} from "@/lib/integrations/business-ru";
import { encryptIntegrationSecret } from "@/lib/integrations/secrets";

export async function connectBusinessRu(formData: FormData) {
  const context = await requireRole(["owner"]);
  const encryptionKey = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim();
  if (!context.tenantId || !context.user?.id || !encryptionKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Защищённое подключение Бизнес.Ру пока не настроено на сервере.");
  }

  let accountDomain: string;
  let credentials: { appId: string; secret: string };
  try {
    accountDomain = normalizeBusinessRuAccountDomain(String(formData.get("accountUrl") ?? ""));
    credentials = validateBusinessRuCredentials(
      String(formData.get("appId") ?? ""),
      String(formData.get("secret") ?? ""),
    );
  } catch {
    throw new Error("Проверьте адрес аккаунта, ID интеграции и 32-символьный секрет Бизнес.Ру.");
  }

  let probe: Awaited<ReturnType<typeof probeBusinessRuConnection>>;
  try {
    probe = await probeBusinessRuConnection({ accountDomain, ...credentials });
  } catch (error) {
    const safeReason = error instanceof BusinessRuApiError && error.code === "unauthorized"
      ? "Бизнес.Ру отклонил ID или секрет. Проверьте данные интеграции."
      : "Бизнес.Ру не подтвердил защищённое подключение. Повторите позже.";
    throw new Error(safeReason);
  }

  const now = new Date();
  const accountUrl = `https://${accountDomain}`;
  const admin = createAdminClient();
  const connectionResult = await admin.from("integration_connections").upsert({
    tenant_id: context.tenantId,
    provider: "biznes_ru",
    account_name: accountDomain.split(".")[0],
    account_domain: accountDomain,
    account_url: accountUrl,
    scopes: [`help:${probe.checkedModel}`],
    token_ciphertext: encryptIntegrationSecret({ ...credentials, token: probe.token }, encryptionKey),
    access_token_expires_at: new Date(now.getTime() + 55 * 60_000).toISOString(),
    connected_by: context.user.id,
    connected_at: now.toISOString(),
    status: "active",
    safe_error: null,
    updated_at: now.toISOString(),
  }, { onConflict: "tenant_id,provider" }).select("id").single();
  if (connectionResult.error || !connectionResult.data) {
    throw new Error("Не удалось сохранить защищённое подключение Бизнес.Ру.");
  }

  const requestResult = await admin.from("crm_integration_requests").upsert({
    tenant_id: context.tenantId,
    provider: "biznes_ru",
    account_url: accountUrl,
    admin_contact: context.user.email ?? null,
    sync_direction: "orders_and_customers",
    status: "connected",
    preflight_summary: "Подпись API и доступ к схеме заказов проверены. Передача реальных данных ещё не включена.",
    safe_error: null,
    secret_reference: connectionResult.data.id,
    last_status_at: now.toISOString(),
    updated_at: now.toISOString(),
  }, { onConflict: "tenant_id,provider" });
  if (requestResult.error) throw new Error("Подключение сохранено, но статус интерфейса не обновился.");

  revalidatePath("/admin/integrations");
}
