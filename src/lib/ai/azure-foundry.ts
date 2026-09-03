import "server-only";
import { z } from "zod";

const configSchema = z.object({
  endpoint: z.string().url(),
  apiKey: z.string().min(20),
  deployment: z.string().min(1),
});

const completionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string().nullable() }),
  })).min(1),
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative().optional(),
    completion_tokens: z.number().int().nonnegative().optional(),
    total_tokens: z.number().int().nonnegative().optional(),
  }).optional(),
});

export type AzureFoundryMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class AzureFoundryError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AzureFoundryError";
  }
}

function getConfig() {
  const parsed = configSchema.safeParse({
    endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT,
    apiKey: process.env.AZURE_AI_FOUNDRY_API_KEY,
    deployment: process.env.AZURE_AI_FOUNDRY_DEPLOYMENT,
  });

  if (!parsed.success) {
    throw new AzureFoundryError("Azure AI не настроен на сервере.");
  }

  return {
    ...parsed.data,
    endpoint: parsed.data.endpoint.replace(/\/+$/, ""),
  };
}

export function getAzureFoundryStatus() {
  const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT;
  const deployment = process.env.AZURE_AI_FOUNDRY_DEPLOYMENT;
  const hasApiKey = Boolean(process.env.AZURE_AI_FOUNDRY_API_KEY);
  const valid = configSchema.safeParse({ endpoint, deployment, apiKey: process.env.AZURE_AI_FOUNDRY_API_KEY }).success;

  return { configured: valid, deployment: deployment ?? null, endpoint: endpoint ?? null, hasApiKey };
}

export async function createAzureFoundryChatCompletion(messages: AzureFoundryMessage[]) {
  const config = getConfig();
  if (!messages.length || messages.some((message) => !message.content.trim() || message.content.length > 12_000)) {
    throw new AzureFoundryError("Некорректный или слишком длинный запрос.");
  }

  const response = await fetch(`${config.endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify({
      model: config.deployment,
      messages,
      temperature: 0.2,
      max_tokens: 600,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new AzureFoundryError(`Azure AI вернул ошибку ${response.status}.`, response.status);
  }

  const parsed = completionSchema.safeParse(await response.json());
  if (!parsed.success) throw new AzureFoundryError("Azure AI вернул ответ неизвестного формата.");
  const content = parsed.data.choices[0]?.message.content?.trim();
  if (!content) throw new AzureFoundryError("Azure AI вернул ответ неизвестного формата.");

  return { content, usage: parsed.data.usage };
}
