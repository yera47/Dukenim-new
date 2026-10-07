import { supabase } from "@/lib/supabase";
import { site } from "@/lib/theme";

export type StoreArchiveAction = "archive" | "restore";

export async function changeStoreArchive(input: { action: StoreArchiveAction; tenantId: string; slug: string; reason: string }) {
  if (!supabase) throw new Error("Подключение к серверу не настроено.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Сессия завершилась. Войдите снова.");
  const response = await fetch(`${site}/api/mobile/stores/archive`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({})) as { error?: string; ok?: boolean };
  if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Операция не выполнена.");
}
