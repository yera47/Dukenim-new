import { z } from "zod";
import {
  disabledProductImageProvider,
  ProductImageProviderError,
  type ProductImageProvider,
  type ProductImageRequest,
  type ProductImageResult,
} from "./product-image-provider";

const configSchema = z.object({
  endpoint: z.string().url(),
  apiKey: z.string().min(20),
  deployment: z.literal("FLUX.2-pro"),
  referenceGuidance: z.literal("true"),
  estimatedMicros: z.coerce.number().int().positive(),
  timeoutMs: z.coerce.number().int().min(5_000).max(120_000),
});

export type AzureProductImageConfig = z.infer<typeof configSchema>;
export type AzureProductImageTransportResult = {
  imageUrl: string;
  requestId: string;
  billedAmountMicros: number;
  modelVersion?: string | null;
};
export type AzureProductImageTransport = (input: {
  config: AzureProductImageConfig;
  request: ProductImageRequest;
  signal: AbortSignal;
}) => Promise<AzureProductImageTransportResult>;
export type AzureProductImageAudit = (event: {
  tenantId: string;
  actorId: string;
  idempotencyKey: string;
  deployment: string;
  referenceKinds: Array<"logo" | "category" | "product">;
  outputImages: 1;
  billedAmountMicros: number | null;
  outcome: "succeeded" | "failed";
}) => void | Promise<void>;

export function getAzureProductImageConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = configSchema.safeParse({
    endpoint: env.AZURE_AI_FLUX_ENDPOINT,
    apiKey: env.AZURE_AI_FOUNDRY_API_KEY,
    deployment: env.AZURE_AI_FLUX_DEPLOYMENT,
    referenceGuidance: env.AZURE_AI_IMAGE_SUPPORTS_REFERENCE,
    estimatedMicros: env.AZURE_AI_IMAGE_ESTIMATED_USD_MICROS,
    timeoutMs: env.AZURE_AI_IMAGE_TIMEOUT_MS ?? "60000",
  });
  if (!parsed.success) return { configured: false as const, config: null, reason: "missing-or-invalid-server-configuration" as const };
  return { configured: true as const, config: parsed.data, reason: null };
}

const fluxResponseSchema = z.object({
  data: z.array(z.object({ url: z.string().url().optional(), b64_json: z.string().min(1).optional() })).min(1).optional(),
  images: z.array(z.object({ url: z.string().url().optional(), b64_json: z.string().min(1).optional() })).min(1).optional(),
  url: z.string().url().optional(),
});

export function createAzureFlux2Transport(input: {
  fetcher?: typeof fetch;
  persistOutput: (value: { tenantId: string; idempotencyKey: string; bytes: Uint8Array; contentType: "image/jpeg" }) => Promise<string>;
}): AzureProductImageTransport {
  return async ({ config, request, signal }) => {
    const images = [request.sourceImage, ...(request.references?.map(reference => reference.image) ?? [])];
    if (images.length > 8) throw new ProductImageProviderError("FLUX.2-pro accepts at most eight reference images.", "not_billed");
    const encoded = images.map(bytes => Buffer.from(bytes).toString("base64"));
    const imageFields = Object.fromEntries(encoded.map((value, index) => [index === 0 ? "input_image" : `input_image_${index + 1}`, value]));
    const response = await (input.fetcher ?? fetch)(`${config.endpoint.replace(/\/+$/, "")}/providers/blackforestlabs/v1/flux-2-pro?api-version=preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}`, "Idempotency-Key": request.idempotencyKey },
      body: JSON.stringify({ model: "FLUX.2-pro", prompt: request.instruction, output_format: "jpeg", num_images: 1, ...imageFields }),
      cache: "no-store",
      signal,
    });
    if (!response.ok) throw new ProductImageProviderError(`Azure FLUX returned ${response.status}.`, response.status < 500 ? "not_billed" : "unknown");
    const parsed = fluxResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw new ProductImageProviderError("Azure FLUX returned an invalid response.", "unknown");
    const first = parsed.data.data?.[0] ?? parsed.data.images?.[0];
    let imageUrl = parsed.data.url ?? first?.url;
    if (!imageUrl && first?.b64_json) {
      imageUrl = await input.persistOutput({ tenantId: request.tenantId, idempotencyKey: request.idempotencyKey, bytes: Buffer.from(first.b64_json, "base64"), contentType: "image/jpeg" });
    }
    if (!imageUrl) throw new ProductImageProviderError("Azure FLUX returned no image.", "unknown");
    return { imageUrl, requestId: response.headers.get("x-request-id") ?? response.headers.get("apim-request-id") ?? request.idempotencyKey, billedAmountMicros: config.estimatedMicros };
  };
}

// The selected Azure deployment defines its exact edit API. Injecting that transport
// prevents guessing a model, route, multipart body, or response schema.
export function createAzureProductImageProvider(input: {
  env?: NodeJS.ProcessEnv;
  transport?: AzureProductImageTransport;
  audit?: AzureProductImageAudit;
} = {}): ProductImageProvider {
  const status = getAzureProductImageConfig(input.env);
  if (!status.configured || !input.transport) return disabledProductImageProvider();
  const { config } = status;
  return {
    capabilities: () => ({ enabled: true, provider: "azure-ai-foundry", model: config.deployment, version: null, supportsFaithfulProductImprovement: true, maxOutputsPerRequest: 1 }),
    estimateCost: async () => ({ currency: "USD", amountMicros: config.estimatedMicros, basis: "configured per-output ceiling" }),
    generate: async (request): Promise<ProductImageResult> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const result = await input.transport!({ config, request, signal: controller.signal });
        if (!z.string().url().safeParse(result.imageUrl).success || !result.requestId || !Number.isSafeInteger(result.billedAmountMicros) || result.billedAmountMicros < 0 || result.billedAmountMicros > config.estimatedMicros) {
          throw new ProductImageProviderError("Azure image result failed validation.", "unknown");
        }
        await input.audit?.({ tenantId: request.tenantId, actorId: request.actorId, idempotencyKey: request.idempotencyKey, deployment: config.deployment, referenceKinds: request.references?.map(item => item.kind) ?? [], outputImages: 1, billedAmountMicros: result.billedAmountMicros, outcome: "succeeded" });
        return { imageUrl: result.imageUrl, requestId: result.requestId, model: config.deployment, version: result.modelVersion ?? null, usage: { outputImages: 1, billedAmountMicros: result.billedAmountMicros }, provenance: { kind: "ai-assisted-product-photo", sourcePreserved: true, provider: "azure-ai-foundry", disposition: "review-copy" } };
      } catch (error) {
        await input.audit?.({ tenantId: request.tenantId, actorId: request.actorId, idempotencyKey: request.idempotencyKey, deployment: config.deployment, referenceKinds: request.references?.map(item => item.kind) ?? [], outputImages: 1, billedAmountMicros: null, outcome: "failed" });
        if (error instanceof ProductImageProviderError) throw error;
        throw new ProductImageProviderError(error instanceof Error ? error.message : "Azure image request failed.", "unknown");
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
