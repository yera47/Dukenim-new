"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { aiRequestSchema, aiRequestSubjects } from "@/lib/ai/request";

export type AiRequestState = { error?: string; requestId?: string };

export async function submitAiRequest(_previous: AiRequestState, form: FormData): Promise<AiRequestState> {
  const input = aiRequestSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "Проверьте текст заявки: от 2 до 3000 символов." };
  let requestId: string;
  try {
    const session = await getSessionContext();
    if (!session?.user || !session.tenantId || !["owner", "superadmin"].includes(session.role)) {
      return { error: "Войдите в аккаунт владельца магазина, затем повторите отправку." };
    }
    const client = await createClient();
    const result = await client.rpc("create_support_request", {
      p_tenant_id: session.tenantId,
      p_text: input.data.text,
      p_subject: aiRequestSubjects[input.data.kind],
      p_source: "ai-studio",
      p_context: { page_path: "/admin/ai-studio", ai_intent: input.data.kind, ai_generation_id: input.data.generationId },
    });
    if (result.error || !result.data) return { error: "Отправка не подтверждена. Повторите попытку: заявка из этого сообщения не продублируется." };
    requestId = result.data;
  } catch {
    return { error: "Не удалось подтвердить отправку. Текст сохранён в карточке. Повторите попытку." };
  }
  revalidatePath("/admin/requests");
  revalidatePath("/root");
  return { requestId };
}
