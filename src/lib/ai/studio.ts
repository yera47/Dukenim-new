import "server-only";
import { z } from "zod";
import { AzureFoundryError, createAzureFoundryChatCompletion, getAzureFoundryStatus } from "@/lib/ai/azure-foundry";

export const aiStudioIntentSchema = z.enum(["hero", "promotion", "catalog_copy", "catalog_structure"]);
export type AiStudioIntent = z.infer<typeof aiStudioIntentSchema>;
export const aiStudioRequestSchema = z.object({ intent: aiStudioIntentSchema, brief: z.string().trim().min(8).max(800) });
export const aiStudioBriefSchema = z.object({ brief: z.string().trim().min(8).max(800) });
export const aiStudioDraftSchema = z.object({
  eyebrow: z.string().trim().max(48).optional(),
  title: z.string().trim().min(2).max(90),
  body: z.string().trim().min(2).max(280),
  ctaLabel: z.string().trim().min(2).max(36),
});
export type AiStudioDraft = z.infer<typeof aiStudioDraftSchema>;
export const aiStudioStructureSchema = z.object({ sections: z.array(z.object({ name: z.string().trim().min(2).max(40), description: z.string().trim().min(2).max(140) })).min(2).max(6) });
export type AiStudioStructure = z.infer<typeof aiStudioStructureSchema>;

const instruction: Record<AiStudioIntent, string> = {
  hero: "Создай текст главного блока витрины: короткая надстрока, заголовок, описание и CTA. Не обещай скидку, доставку или оплату, если их нет во вводных.",
  promotion: "Создай черновик промо-блока витрины: надстрока, заголовок, описание и CTA. Не придумывай срок, размер скидки, остатки или юридические условия.",
  catalog_copy: "Создай текст для каталога или подборки: надстрока, заголовок, описание и CTA. Не придумывай характеристики, цену, наличие или медицинские обещания.",
  catalog_structure: "Предложи от 2 до 6 разделов каталога под описанный бизнес. Для каждого дай короткое название и одну фразу назначения. Не придумывай товары, цены или остатки.",
};

export function getAiStudioStatus() {
  const azure = getAzureFoundryStatus();
  return { configured: azure.configured && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), imageConfigured: Boolean(process.env.FAL_KEY), deployment: azure.deployment };
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

export async function createAiStudioStructure(brief: string) {
  if (!getAiStudioStatus().configured) throw new AzureFoundryError("AI Studio ещё не включён: не завершена серверная настройка Azure или базы данных.");
  const result = await createAzureFoundryChatCompletion([{ role: "system", content: "Ты Dukenim AI Studio. Верни строго JSON без markdown: {\"sections\":[{\"name\":string,\"description\":string}]}. Только структура каталога, от 2 до 6 разделов." }, { role: "user", content: `${instruction.catalog_structure}\n\nВводные владельца: ${brief}` }]);
  let raw: unknown; try { raw = JSON.parse(result.content); } catch { throw new AzureFoundryError("AI Studio вернул некорректную структуру."); }
  const structure = aiStudioStructureSchema.safeParse(raw); if (!structure.success) throw new AzureFoundryError("AI Studio вернул структуру вне разрешённого формата.");
  return { structure: structure.data, usage: result.usage };
}
