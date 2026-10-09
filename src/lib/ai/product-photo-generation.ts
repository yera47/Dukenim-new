import { createHash } from "node:crypto";
import {
  ProductImageInProgressError,
  ProductImageProviderError,
  ProductImageUnavailableError,
  type ProductImageProvider,
  type ProductImageRequest,
  type ProductImageResult,
} from "./product-image-provider";

export type ProductPhotoPackRequest = Omit<ProductImageRequest, "idempotencyKey"> & {
  idempotencyKey: string;
  outputCount: 2 | 3 | 4 | 5;
  resolution: string;
  referenceMegapixels: number;
};

export type ProductPhotoPackResult = {
  reservationId: string;
  outputs: ProductImageResult[];
  failedOutputs: number;
  cached: boolean;
};

export type ProductPhotoLedger = {
  findCachedPack(input: { tenantId: string; idempotencyKey: string }): Promise<ProductPhotoPackResult | null>;
  reservePack(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    outputCount: number;
    model: string;
    resolution: string;
    referenceMegapixels: number;
    expectedUsdMicrosPerOutput: number;
  }): Promise<{ reservationId: string; acquired: boolean }>;
  recordOutput(input: { tenantId: string; reservationId: string; outputIndex: number; result: ProductImageResult }): Promise<void>;
  settlePack(input: { tenantId: string; reservationId: string; successfulOutputs: number; providerRequestIds: string[] }): Promise<void>;
  releasePack(input: { tenantId: string; reservationId: string; reason: string }): Promise<void>;
  markUncertain(input: { tenantId: string; reservationId: string; reason: string; outputIndex?: number; result?: ProductImageResult }): Promise<void>;
};

export class ProductPhotoPackCostError extends Error {}

export function deriveOutputIdempotencyKey(packKey: string, outputIndex: number) {
  const bytes = Buffer.from(createHash("sha256").update(`${packKey}:${outputIndex}`).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function generateProductPhotoPack(input: {
  request: ProductPhotoPackRequest;
  provider: ProductImageProvider;
  ledger: ProductPhotoLedger;
  maxPackCostMicros: number;
}): Promise<ProductPhotoPackResult> {
  const { request, provider, ledger } = input;
  const cached = await ledger.findCachedPack({ tenantId: request.tenantId, idempotencyKey: request.idempotencyKey });
  if (cached) return { ...cached, cached: true };

  const capabilities = provider.capabilities();
  if (!capabilities.enabled || !capabilities.model || !capabilities.supportsFaithfulProductImprovement) {
    throw new ProductImageUnavailableError("Product photo generation is not configured.");
  }
  const estimate = await provider.estimateCost({ ...request, idempotencyKey: deriveOutputIdempotencyKey(request.idempotencyKey, 1) });
  const perOutput = estimate.amountMicros;
  if (estimate.currency !== "USD" || perOutput === null || !Number.isSafeInteger(perOutput) || perOutput <= 0) {
    throw new ProductPhotoPackCostError("Provider price is not confirmed.");
  }
  const totalEstimate = perOutput * request.outputCount;
  if (!Number.isSafeInteger(input.maxPackCostMicros) || input.maxPackCostMicros <= 0 || totalEstimate > input.maxPackCostMicros) {
    throw new ProductPhotoPackCostError("The request exceeds the server-side pack cost ceiling.");
  }

  const reservation = await ledger.reservePack({
    tenantId: request.tenantId,
    actorId: request.actorId,
    idempotencyKey: request.idempotencyKey,
    outputCount: request.outputCount,
    model: capabilities.model,
    resolution: request.resolution,
    referenceMegapixels: request.referenceMegapixels,
    expectedUsdMicrosPerOutput: perOutput,
  });
  if (!reservation.acquired) throw new ProductImageInProgressError("This generation is already running.");

  const outputs: ProductImageResult[] = [];
  let notBilledFailures = 0;
  for (let outputIndex = 1; outputIndex <= request.outputCount; outputIndex += 1) {
    let result: ProductImageResult;
    try {
      result = await provider.generate({ ...request, idempotencyKey: deriveOutputIdempotencyKey(request.idempotencyKey, outputIndex) });
      if (!result.storagePath.startsWith(`${request.tenantId}/`) || result.storagePath.includes("..") || result.usage.billedAmountMicros === null || result.usage.billedAmountMicros > perOutput) {
        throw new ProductImageProviderError("Persisted provider result failed validation.", "unknown");
      }
    } catch (error) {
      if (error instanceof ProductImageProviderError && error.billingState === "not_billed") {
        notBilledFailures += 1;
        continue;
      }
      await ledger.markUncertain({ tenantId: request.tenantId, reservationId: reservation.reservationId, reason: error instanceof Error ? error.message : "unknown generation failure" });
      throw error;
    }
    try {
      await ledger.recordOutput({ tenantId: request.tenantId, reservationId: reservation.reservationId, outputIndex, result });
      outputs.push(result);
    } catch (error) {
      await ledger.markUncertain({ tenantId: request.tenantId, reservationId: reservation.reservationId, reason: "durable output exists but ledger recording failed", outputIndex, result });
      throw error;
    }
  }

  if (outputs.length === 0) {
    try {
      await ledger.releasePack({ tenantId: request.tenantId, reservationId: reservation.reservationId, reason: "all provider attempts failed before billing" });
    } catch (error) {
      await ledger.markUncertain({ tenantId: request.tenantId, reservationId: reservation.reservationId, reason: "confirmed non-billed reservation could not be released" }).catch(() => undefined);
      throw error;
    }
    throw new ProductImageProviderError("All provider attempts failed before billing.", "not_billed");
  } else {
    try {
      await ledger.settlePack({ tenantId: request.tenantId, reservationId: reservation.reservationId, successfulOutputs: outputs.length, providerRequestIds: outputs.map(output => output.requestId) });
    } catch (error) {
      await ledger.markUncertain({ tenantId: request.tenantId, reservationId: reservation.reservationId, reason: "durable outputs exist but settlement failed" }).catch(() => undefined);
      throw error;
    }
  }
  return { reservationId: reservation.reservationId, outputs, failedOutputs: notBilledFailures, cached: false };
}
