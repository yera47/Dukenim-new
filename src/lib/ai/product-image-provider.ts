// Side-effect-free provider contract. Credentials and transports belong in server-only adapters.
export type ProductImageCapabilities = {
  enabled: boolean;
  provider: string;
  model: string | null;
  version: string | null;
  supportsFaithfulProductImprovement: boolean;
  maxOutputsPerRequest: 1;
};

export type ProductImageEstimate = { currency: "USD"; amountMicros: number | null; basis: string };
export type ProductImageUsage = { outputImages: 1; billedAmountMicros: number | null };
export type ProductImageResult = {
  imageUrl: string;
  requestId: string;
  model: string;
  version: string | null;
  usage: ProductImageUsage;
  provenance: { kind: "ai-assisted-product-photo"; sourcePreserved: true; provider: string; disposition?: "review-copy" };
};
export type ProductImageReference = { kind: "logo" | "category" | "product"; image: Uint8Array };
export type ProductImageRequest = {
  tenantId: string;
  actorId: string;
  idempotencyKey: string;
  sourceImage: Uint8Array;
  references?: ProductImageReference[];
  brandContext?: { palette: string[]; category?: string };
  instruction: string;
  merchantApproved: true;
};

export interface ProductImageProvider {
  capabilities(): ProductImageCapabilities;
  estimateCost(request: ProductImageRequest): Promise<ProductImageEstimate>;
  generate(request: ProductImageRequest): Promise<ProductImageResult>;
}

export class ProductImageUnavailableError extends Error {}
export class ProductImageInProgressError extends Error {}
export class ProductImageProviderError extends Error {
  constructor(message: string, readonly billingState: "not_billed" | "unknown") {
    super(message);
  }
}

export function disabledProductImageProvider(): ProductImageProvider {
  const capabilities: ProductImageCapabilities = {
    enabled: false,
    provider: "disabled",
    model: null,
    version: null,
    supportsFaithfulProductImprovement: false,
    maxOutputsPerRequest: 1,
  };
  return {
    capabilities: () => capabilities,
    estimateCost: async () => ({ currency: "USD", amountMicros: null, basis: "Provider is not configured." }),
    generate: async () => { throw new ProductImageUnavailableError("Улучшение фото товара пока не подключено на сервере."); },
  };
}

export type ProductImageGenerationPorts = {
  provider: ProductImageProvider;
  findCached: (tenantId: string, idempotencyKey: string) => Promise<ProductImageResult | null>;
  // Must atomically reserve both quota and budget for (tenantId,idempotencyKey).
  // acquired=false means another request already owns this generation.
  reserveBudget: (input: { tenantId: string; idempotencyKey: string; estimate: ProductImageEstimate }) => Promise<{ reservationId: string; acquired?: boolean }>;
  commitUsage: (input: { reservationId: string; result: ProductImageResult }) => Promise<void>;
  releaseBudget: (reservationId: string) => Promise<void>;
  markUncertain?: (input: { reservationId: string; reason: string }) => Promise<void>;
};

function knownNonNegativeMicros(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value >= 0;
}

// Authorization and tenant membership must be checked by the server route first.
// One owner action can produce at most one provider request; ambiguous billing is never auto-retried.
export async function generateProductImage(request: ProductImageRequest, ports: ProductImageGenerationPorts) {
  if (!request.merchantApproved || !/^[0-9a-f-]{36}$/i.test(request.idempotencyKey)) throw new Error("Требуется явное подтверждение и корректный ключ запроса.");
  if (!request.tenantId || !request.actorId || request.sourceImage.byteLength < 1 || request.sourceImage.byteLength > 10_000_000) throw new Error("Некорректный исходник товара.");
  if ((request.references?.length ?? 0) > 6 || request.references?.some(reference => reference.image.byteLength < 1 || reference.image.byteLength > 10_000_000)) throw new Error("Некорректные референсы изображений.");
  if (!request.instruction.trim() || request.instruction.length > 500) throw new Error("Опишите только улучшение фона и света.");
  const capabilities = ports.provider.capabilities();
  if (!capabilities.enabled || !capabilities.supportsFaithfulProductImprovement) throw new ProductImageUnavailableError("Улучшение фото товара пока не подключено на сервере.");
  const cached = await ports.findCached(request.tenantId, request.idempotencyKey);
  if (cached) return cached;
  const estimate = await ports.provider.estimateCost(request);
  if (estimate.currency !== "USD" || !knownNonNegativeMicros(estimate.amountMicros)) throw new ProductImageUnavailableError("Стоимость запроса не подтверждена; генерация не запущена.");
  const reservation = await ports.reserveBudget({ tenantId: request.tenantId, idempotencyKey: request.idempotencyKey, estimate });
  if (reservation.acquired === false) throw new ProductImageInProgressError("Этот запрос уже выполняется.");

  let result: ProductImageResult;
  try {
    result = await ports.provider.generate(request);
  } catch (error) {
    if (error instanceof ProductImageProviderError && error.billingState === "not_billed") {
      await ports.releaseBudget(reservation.reservationId);
    } else {
      await ports.markUncertain?.({ reservationId: reservation.reservationId, reason: error instanceof Error ? error.message : "unknown provider failure" });
    }
    throw error;
  }

  const validResult = result.provenance.kind === "ai-assisted-product-photo"
    && result.provenance.sourcePreserved
    && result.usage.outputImages === 1
    && knownNonNegativeMicros(result.usage.billedAmountMicros)
    && result.usage.billedAmountMicros <= estimate.amountMicros;
  if (!validResult) {
    await ports.markUncertain?.({ reservationId: reservation.reservationId, reason: "provider result or billed amount failed validation" });
    throw new Error("Провайдер вернул неподтверждённый результат; автоматический повтор запрещён.");
  }
  try {
    await ports.commitUsage({ reservationId: reservation.reservationId, result });
  } catch (error) {
    await ports.markUncertain?.({ reservationId: reservation.reservationId, reason: "usage commit failed after provider success" });
    throw error;
  }
  return result;
}
