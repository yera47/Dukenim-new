import "server-only";
import { z } from "zod";
import { describeAzureFoundryResponse, parseAzureFoundryResponse } from "./azure-response";
import {azureMessageSchema,type AzureFoundryMessage} from "./message-input";
export type {AzureFoundryMessage} from "./message-input";

const configSchema = z.object({
  endpoint: z.string().url(),
  apiKey: z.string().min(20),
  deployment: z.string().min(1),
});

export class AzureFoundryError extends Error {
  constructor(message: string, readonly status?: number, readonly code:string="provider_error") {
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
  if (!messages.length || messages.length>20 || messages.some((message) => !azureMessageSchema.safeParse(message).success)) {
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
      response_format: { type: "json_object" },
      // Azure's OpenAI-compatible gateway uses reasoning_effort, not Moonshot's thinking field.
      ...(/^kimi-k2\.6$/i.test(config.deployment) ? { reasoning_effort: "none" } : { temperature: 0.2 }),
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
    const diagnostic=describeAzureFoundryResponse(payload);
    console.error("[azure-ai] Unexpected response shape", diagnostic);
    throw new AzureFoundryError("Azure AI вернул ответ неизвестного формата.",502,diagnostic.finishReason==="length"?"output_limit":"invalid_schema");
  }
}

const imageConfigSchema = z.object({ endpoint: z.string().url(), apiKey: z.string().min(20), deployment: z.string().min(1) });
function getImageConfig() { const parsed = imageConfigSchema.safeParse({ endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT, apiKey: process.env.AZURE_AI_FOUNDRY_API_KEY, deployment: process.env.AZURE_AI_FOUNDRY_IMAGE_DEPLOYMENT }); if (!parsed.success) throw new AzureFoundryError("Генерация баннеров ещё не настроена на сервере."); return { ...parsed.data, endpoint: parsed.data.endpoint.replace(/\/+$/, "") }; }
export function getAzureFoundryImageStatus() { const deployment = process.env.AZURE_AI_FOUNDRY_IMAGE_DEPLOYMENT; return { configured: imageConfigSchema.safeParse({ endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT, apiKey: process.env.AZURE_AI_FOUNDRY_API_KEY, deployment }).success, deployment: deployment ?? null }; }
export async function createAzureFoundryImage(prompt: string) { const config = getImageConfig(); if (!prompt.trim() || prompt.length > 4000) throw new AzureFoundryError("Некорректное описание баннера."); const response = await fetch(`${config.endpoint}/images/generations`, { method: "POST", headers: { "Content-Type": "application/json", "api-key": config.apiKey }, body: JSON.stringify({ model: config.deployment, prompt, size: "1024x1024", n: 1 }), cache: "no-store", signal: AbortSignal.timeout(60000) }); if (!response.ok) throw new AzureFoundryError(`Генератор баннеров вернул ошибку ${response.status}.`, response.status); const payload: unknown = await response.json(); const parsed = z.object({ data: z.array(z.object({ b64_json: z.string().optional(), url: z.string().url().optional() })).min(1) }).safeParse(payload); if (!parsed.success || (!parsed.data.data[0].b64_json && !parsed.data.data[0].url)) throw new AzureFoundryError("Генератор баннеров вернул некорректный ответ."); return parsed.data.data[0]; }
