import "server-only";
import { z } from "zod";
import { AzureFoundryError, createAzureFoundryChatCompletion, getAzureFoundryStatus } from "@/lib/ai/azure-foundry";

export const aiStudioIntentSchema = z.enum(["hero", "promotion", "catalog_copy"]);
export type AiStudioIntent = z.infer<typeof aiStudioIntentSchema>;
export const aiStudioRequestSchema = z.object({ intent: aiStudioIntentSchema, brief: z.string().trim().min(8).max(800) });
export const aiStudioDraftSchema = z.object({
  eyebrow: z.string().trim().max(48).optional(),
  title: z.string().trim().min(2).max(90),
  body: z.string().trim().min(2).max(280),
  ctaLabel: z.string().trim().min(2).max(36),
});
export type AiStudioDraft = z.infer<typeof aiStudioDraftSchema>;

const instruction: Record<AiStudioIntent, string> = {
  hero: "Создай текст главного блока витрины: короткая надстрока, заголовок, описание и CTA. Не обещай скидку, доставку или оплату, если их нет во вводных.",
  promotion: "Создай черновик промо-блока витрины: надстрока, заголовок, описание и CTA. Не придумывай срок, размер скидки, остатки или юридические условия.",
  catalog_copy: "Создай текст для каталога или подборки: надстрока, заголовок, описание и CTA. Не придумывай характеристики, цену, наличие или медицинские обещания.",
};

export function getAiStudioStatus() {
  const azure = getAzureFoundryStatus();
  return { configured: azure.configured && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), deployment: azure.deployment };
}

export async function createAiStudioDraft(intent: AiStudioIntent, brief: string) {
  if (!getAiStudioStatus().configured) throw new AzureFoundryError("AI Studio ещё не включён: не завершена серверная настройка Azure или базы данных.");
  const result = await createAzureFoundryChatCompletion([
    { role: "system", content: "Ты Dukenim AI Studio — ограниченный редактор витрин казахстанских магазинов. Ты создаёшь только безопасные текстовые черновики для витрины по разрешённому сценарию. Не отвечай на общие вопросы, не пиши код, не давай инструкции по другим приложениям, не меняй тарифы и не имитируй опубликованные изменения. Верни строго JSON без markdown: {\\\"eyebrow\\\":string,\\\"title\\\":string,\\\"body\\\":string,\\\"ctaLabel\\\":string}.", },
    { role: "user", content: `${instruction[intent]}\\n\\nВводные владельца: ${brief}` },
  ]);
  let raw: unknown;
  try { raw = JSON.parse(result.content); } catch { throw new AzureFoundryError("AI Studio вернул некорректный черновик. Попробуйте ещё раз."); }
  const draft = aiStudioDraftSchema.safeParse(raw);
  if (!draft.success) throw new AzureFoundryError("AI Studio вернул черновик вне разрешённого формата.");
  return { draft: draft.data, usage: result.usage };
}
