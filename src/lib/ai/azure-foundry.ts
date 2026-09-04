import "server-only";
import { z } from "zod";
import { describeAzureFoundryResponse, parseAzureFoundryResponse } from "./azure-response";

const configSchema = z.object({
  endpoint: z.string().url(),
  apiKey: z.string().min(20),
  deployment: z.string().min(1),
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

const imageConfigSchema = z.object({
  endpoint: z.string().url(),
  apiKey: z.string().min(20),
  deployment: z.string().min(1),
});

function getImageConfig() {
  const parsed = imageConfigSchema.safeParse({
    endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT,
    apiKey: process.env.AZURE_AI_FOUNDRY_API_KEY,
    deployment: process.env.AZURE_AI_FOUNDRY_IMAGE_DEPLOYMENT,
  });

  if (!parsed.success) {
    throw new AzureFoundryError("Генерация баннеров ещё не настроена на сервере.");
  }

  return { ...parsed.data, endpoint: parsed.data.endpoint.replace(/\/+$/, "") };
}

// Separate from getAzureFoundryStatus(): the image deployment is optional and independent of
// the text deployment, so a missing image model never breaks text drafts and vice versa.
export function getAzureFoundryImageStatus() {
  const deployment = process.env.AZURE_AI_FOUNDRY_IMAGE_DEPLOYMENT;
  const valid = imageConfigSchema.safeParse({
    endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT,
    apiKey: process.env.AZURE_AI_FOUNDRY_API_KEY,
    deployment,
  }).success;
  return { configured: valid, deployment: deployment ?? null };
}

const imageResponseSchema = z.object({
  data: z.array(z.object({ b64_json: z.string().optional(), url: z.string().url().optional() })).min(1),
});

export async function createAzureFoundryImage(prompt: string) {
  const config = getImageConfig();
  if (!prompt.trim() || prompt.length > 4_000) {
    throw new AzureFoundryError("Некорректное описание баннера.");
  }

  const response = await fetch(`${config.endpoint}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify({
      model: config.deployment,
      prompt,
      size: "1024x1024",
      n: 1,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new AzureFoundryError(`Генератор баннеров вернул ошибку ${response.status}.`, response.status);
  }

  const payload: unknown = await response.json();
  const parsed = imageResponseSchema.safeParse(payload);
  if (!parsed.success) {
    console.error("[azure-ai] Unexpected image response shape", describeAzureFoundryResponse(payload));
    throw new AzureFoundryError("Генератор баннеров вернул ответ неизвестного формата.");
  }

  const [image] = parsed.data.data;
  if (!image.b64_json && !image.url) throw new AzureFoundryError("Генератор баннеров не вернул изображение.");
  return image;
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
      max_tokens: 1_600,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new AzureFoundryError(`Azure AI вернул ошибку ${response.status}.`, response.status);
  }

  const payload: unknown = await response.json();
  try {
    return parseAzureFoundryResponse(payload);
  } catch {
    console.error("[azure-ai] Unexpected response shape", describeAzureFoundryResponse(payload));
    throw new AzureFoundryError("Azure AI вернул ответ неизвестного формата.");
  }
}
