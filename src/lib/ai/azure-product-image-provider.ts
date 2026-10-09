import { z } from "zod";
import { isIP } from "node:net";
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
  storagePath: string;
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
  downloadOutput?: (url: string, signal: AbortSignal) => Promise<Uint8Array>;
  persistOutput: (value: { tenantId: string; idempotencyKey: string; bytes: Uint8Array; contentType: "image/jpeg" }) => Promise<{ imageUrl: string; storagePath: string }>;
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
    const encodedOutput = first?.b64_json;
    const outputUrl = parsed.data.url ?? first?.url;
    const bytes = encodedOutput ? Buffer.from(encodedOutput, "base64") : outputUrl
      ? Buffer.from(await (input.downloadOutput ?? ((url, downloadSignal) => downloadAzureOutput(url, downloadSignal, input.fetcher ?? fetch)))(outputUrl, signal))
      : Buffer.alloc(0);
    if (bytes.length < 4 || bytes.length > 10_000_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
      throw new ProductImageProviderError("Azure FLUX returned an invalid JPEG.", "unknown");
    }
    const stored = await input.persistOutput({ tenantId: request.tenantId, idempotencyKey: request.idempotencyKey, bytes, contentType: "image/jpeg" });
    return { ...stored, requestId: response.headers.get("x-request-id") ?? response.headers.get("apim-request-id") ?? request.idempotencyKey, billedAmountMicros: config.estimatedMicros };
  };
}

function safeRemoteImageUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  if (isIP(host) === 4) {
    const [a, b] = host.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return false;
  }
  if (isIP(host) === 6 && (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80"))) return false;
  return true;
}

export async function downloadAzureOutput(url: string, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  if (!safeRemoteImageUrl(url)) throw new ProductImageProviderError("Azure returned an unsafe image URL.", "unknown");
  const response = await fetcher(url, { method: "GET", redirect: "error", cache: "no-store", signal });
  const length = Number(response.headers.get("content-length") ?? 0);
  if (!response.ok || (length && length > 10_000_000) || !/^image\/jpeg(?:;|$)/i.test(response.headers.get("content-type") ?? "")) throw new ProductImageProviderError("Azure image download failed validation.", "unknown");
  if (!response.body) throw new ProductImageProviderError("Azure image download returned no body.", "unknown");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 10_000_000) { await reader.cancel(); throw new ProductImageProviderError("Azure image download exceeded 10 MB.", "unknown"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
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
        if (!z.string().url().safeParse(result.imageUrl).success || !result.storagePath.startsWith(`${request.tenantId}/`) || result.storagePath.includes("..") || !result.requestId || !Number.isSafeInteger(result.billedAmountMicros) || result.billedAmountMicros < 0 || result.billedAmountMicros > config.estimatedMicros) {
          throw new ProductImageProviderError("Azure image result failed validation.", "unknown");
        }
        await input.audit?.({ tenantId: request.tenantId, actorId: request.actorId, idempotencyKey: request.idempotencyKey, deployment: config.deployment, referenceKinds: request.references?.map(item => item.kind) ?? [], outputImages: 1, billedAmountMicros: result.billedAmountMicros, outcome: "succeeded" });
        return { imageUrl: result.imageUrl, storagePath: result.storagePath, requestId: result.requestId, model: config.deployment, version: result.modelVersion ?? null, usage: { outputImages: 1, billedAmountMicros: result.billedAmountMicros, billingBasis: "configured-ceiling" }, provenance: { kind: "ai-assisted-product-photo", sourcePreserved: true, provider: "azure-ai-foundry", disposition: "review-copy" } };
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
