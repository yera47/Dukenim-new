import "server-only";
import { z } from "zod";
import { AzureFoundryError, createAzureFoundryChatCompletion, createAzureFoundryImage, getAzureFoundryImageStatus, getAzureFoundryStatus } from "@/lib/ai/azure-foundry";
import { aiStudioIntentSchema, BannerBriefRejected, guardBannerBrief, type AiStudioIntent } from "@/lib/ai/studio-guard";

export { aiStudioIntentSchema, aiCreditCost, type AiStudioIntent } from "@/lib/ai/studio-guard";
export const aiStudioRequestSchema = z.object({ intent: aiStudioIntentSchema, brief: z.string().trim().min(8).max(800) });

export const aiStudioDraftSchema = z.object({
  eyebrow: z.string().trim().max(48).optional(),
  title: z.string().trim().min(2).max(90),
  body: z.string().trim().min(2).max(280),
  ctaLabel: z.string().trim().min(2).max(36),
});
export type AiStudioDraft = z.infer<typeof aiStudioDraftSchema>;

export const aiStudioStructureSchema = z.object({
  sections: z.array(z.object({ name: z.string().trim().min(2).max(40), description: z.string().trim().min(2).max(140) })).min(2).max(6),
});
export type AiStudioStructure = z.infer<typeof aiStudioStructureSchema>;

export type AiStudioBanner = { imageUrl?: string; imageBase64?: string };

const textInstruction: Record<Exclude<AiStudioIntent, "banner">, string> = {
  hero: "Создай текст главного блока витрины: короткая надстрока, заголовок, описание и CTA. Не обещай скидку, доставку или оплату, если их нет во вводных.",
  promotion: "Создай черновик промо-блока витрины: надстрока, заголовок, описание и CTA. Не придумывай срок, размер скидки, остатки или юридические условия.",
  catalog_copy: "Создай текст для каталога или подборки: надстрока, заголовок, описание и CTA. Не придумывай характеристики, цену, наличие или медицинские обещания.",
  catalog_structure: "Предложи от 2 до 6 разделов каталога или сайта под описанный бизнес: короткое название и одну фразу назначения для каждого. Не придумывай товары, цены или остатки — только структуру.",
};

export function getAiStudioStatus() {
  const azure = getAzureFoundryStatus();
  return { configured: azure.configured && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), deployment: azure.deployment };
}

export function getAiStudioBannerStatus() {
  const image = getAzureFoundryImageStatus();
  return { configured: image.configured && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), deployment: image.deployment };
}

export async function createAiStudioDraft(intent: "hero" | "promotion" | "catalog_copy", brief: string) {
  if (!getAiStudioStatus().configured) throw new AzureFoundryError("AI Studio ещё не включён: не завершена серверная настройка Azure или базы данных.");
  const result = await createAzureFoundryChatCompletion([
    { role: "system", content: "Ты Dukenim AI Studio — ограниченный редактор витрин казахстанских магазинов. Ты создаёшь только безопасные текстовые черновики для витрины по разрешённому сценарию. Не отвечай на общие вопросы, не пиши код, не давай инструкции по другим приложениям, не меняй тарифы и не имитируй опубликованные изменения. Верни строго JSON без markdown: {\"eyebrow\":string,\"title\":string,\"body\":string,\"ctaLabel\":string}." },
    { role: "user", content: `${textInstruction[intent]}\n\nВводные владельца: ${brief}` },
  ]);
  let raw: unknown;
  try { raw = JSON.parse(result.content); } catch { throw new AzureFoundryError("AI Studio вернул некорректный черновик. Попробуйте ещё раз."); }
  const draft = aiStudioDraftSchema.safeParse(raw);
  if (!draft.success) throw new AzureFoundryError("AI Studio вернул черновик вне разрешённого формата.");
  return { draft: draft.data, usage: result.usage };
}

export async function createAiStudioStructure(brief: string) {
  if (!getAiStudioStatus().configured) throw new AzureFoundryError("AI Studio ещё не включён: не завершена серверная настройка Azure или базы данных.");
  const result = await createAzureFoundryChatCompletion([
    { role: "system", content: "Ты Dukenim AI Studio — ограниченный помощник по структуре витрины казахстанских магазинов. Ты предлагаешь только список разделов каталога/сайта, ничего больше. Не отвечай на общие вопросы, не пиши код, не придумывай товары или цены. Верни строго JSON без markdown: {\"sections\":[{\"name\":string,\"description\":string}]}, от 2 до 6 элементов." },
    { role: "user", content: `${textInstruction.catalog_structure}\n\nВводные владельца: ${brief}` },
  ]);
  let raw: unknown;
  try { raw = JSON.parse(result.content); } catch { throw new AzureFoundryError("AI Studio вернул некорректную структуру. Попробуйте ещё раз."); }
  const structure = aiStudioStructureSchema.safeParse(raw);
  if (!structure.success) throw new AzureFoundryError("AI Studio вернул структуру вне разрешённого формата.");
  return { structure: structure.data, usage: result.usage };
}

export async function createAiStudioBanner(brief: string) {
  try {
    guardBannerBrief(brief);
  } catch (error) {
    if (error instanceof BannerBriefRejected) throw new AzureFoundryError(error.message);
    throw error;
  }
  if (!getAiStudioBannerStatus().configured) throw new AzureFoundryError("Генерация баннеров ещё не подключена.");
  const prompt = `Абстрактный рекламный баннер для витрины интернет-магазина в Казахстане. Только фон, композиция, свет и текстура — без людей, без конкретной одежды или товара, без текста на изображении. Настроение и тема: ${brief}`;
  const image = await createAzureFoundryImage(prompt);
  return { image: image as AiStudioBanner, usage: {} };
}
