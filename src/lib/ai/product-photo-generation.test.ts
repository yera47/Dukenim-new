import { describe, expect, it, vi } from "vitest";
import { ProductImageInProgressError, ProductImageProviderError, type ProductImageProvider } from "./product-image-provider";
import { deriveOutputIdempotencyKey, generateProductPhotoPack, ProductPhotoPackCostError, type ProductPhotoLedger } from "./product-photo-generation";

const request = {
  tenantId: "tenant-a", actorId: "owner-a", idempotencyKey: "00000000-0000-4000-8000-000000000001",
  sourceImage: new Uint8Array([1]), instruction: "Improve the background only.", merchantApproved: true as const,
  outputCount: 3 as const, resolution: "1MP", referenceMegapixels: 1,
};
const capabilities = { enabled: true, provider: "fixture", model: "fixture-model", version: "1", supportsFaithfulProductImprovement: true, maxOutputsPerRequest: 1 as const };

function result(index: number) {
  return { imageUrl: `https://storage.test/${index}.jpg`, storagePath: `tenant-a/ai/product-photos/${index}.jpg`, requestId: `provider-${index}`, model: "fixture-model", version: "1", usage: { outputImages: 1 as const, billedAmountMicros: 10, billingBasis: "provider-reported" as const }, provenance: { kind: "ai-assisted-product-photo" as const, sourcePreserved: true as const, provider: "fixture", disposition: "review-copy" as const } };
}

function setup(generate: ProductImageProvider["generate"]) {
  const provider: ProductImageProvider = { capabilities: () => capabilities, estimateCost: async () => ({ currency: "USD", amountMicros: 10, basis: "fixture" }), generate };
  const ledger: ProductPhotoLedger = {
    findCachedPack: vi.fn(async () => null), reservePack: vi.fn(async () => ({ reservationId: "reservation-a", acquired: true })),
    recordOutput: vi.fn(async () => undefined), settlePack: vi.fn(async () => undefined), releasePack: vi.fn(async () => undefined), markUncertain: vi.fn(async () => undefined),
  };
  return { provider, ledger };
}

describe("product photo pack generation", () => {
  it("uses stable distinct output idempotency keys", () => {
    expect(deriveOutputIdempotencyKey(request.idempotencyKey, 1)).toMatch(/^[0-9a-f-]{36}$/);
    expect(deriveOutputIdempotencyKey(request.idempotencyKey, 1)).toBe(deriveOutputIdempotencyKey(request.idempotencyKey, 1));
    expect(deriveOutputIdempotencyKey(request.idempotencyKey, 1)).not.toBe(deriveOutputIdempotencyKey(request.idempotencyKey, 2));
  });

  it("does not call the provider when a parallel request already owns the reservation", async () => {
    const generate = vi.fn(async () => result(1));
    const { provider, ledger } = setup(generate);
    vi.mocked(ledger.reservePack).mockResolvedValueOnce({ reservationId: "reservation-a", acquired: false });
    await expect(generateProductPhotoPack({ request, provider, ledger, maxPackCostMicros: 30 })).rejects.toBeInstanceOf(ProductImageInProgressError);
    expect(generate).not.toHaveBeenCalled();
  });

  it("persists every output before one atomic settlement", async () => {
    let index = 0;
    const { provider, ledger } = setup(async () => result(++index));
    const generated = await generateProductPhotoPack({ request, provider, ledger, maxPackCostMicros: 30 });
    expect(generated.outputs).toHaveLength(3);
    expect(ledger.recordOutput).toHaveBeenCalledTimes(3);
    expect(ledger.settlePack).toHaveBeenCalledWith(expect.objectContaining({ successfulOutputs: 3, providerRequestIds: ["provider-1", "provider-2", "provider-3"] }));
    expect(ledger.releasePack).not.toHaveBeenCalled();
  });

  it("settles only persisted successes and refunds confirmed non-billed failures", async () => {
    let index = 0;
    const { provider, ledger } = setup(async () => { index += 1; if (index === 2) throw new ProductImageProviderError("rejected", "not_billed"); return result(index); });
    const generated = await generateProductPhotoPack({ request, provider, ledger, maxPackCostMicros: 30 });
    expect(generated).toMatchObject({ failedOutputs: 1 });
    expect(ledger.settlePack).toHaveBeenCalledWith(expect.objectContaining({ successfulOutputs: 2 }));
  });

  it("keeps an ambiguous billed reservation for reconciliation", async () => {
    const { provider, ledger } = setup(async () => { throw new ProductImageProviderError("timeout", "unknown"); });
    await expect(generateProductPhotoPack({ request, provider, ledger, maxPackCostMicros: 30 })).rejects.toThrow("timeout");
    expect(ledger.markUncertain).toHaveBeenCalledOnce();
    expect(ledger.releasePack).not.toHaveBeenCalled();
    expect(ledger.settlePack).not.toHaveBeenCalled();
  });

  it("rejects a durable path from another tenant before ledger recording", async () => {
    const { provider, ledger } = setup(async () => ({ ...result(1), storagePath: "tenant-b/ai/product-photos/1.jpg" }));
    await expect(generateProductPhotoPack({ request, provider, ledger, maxPackCostMicros: 30 })).rejects.toThrow("validation");
    expect(ledger.recordOutput).not.toHaveBeenCalled();
    expect(ledger.markUncertain).toHaveBeenCalledOnce();
  });

  it("journals durable output metadata when ledger recording fails", async () => {
    const { provider, ledger } = setup(async () => result(1));
    vi.mocked(ledger.recordOutput).mockRejectedValueOnce(new Error("database unavailable"));
    await expect(generateProductPhotoPack({ request, provider, ledger, maxPackCostMicros: 30 })).rejects.toThrow("database unavailable");
    expect(ledger.markUncertain).toHaveBeenCalledWith(expect.objectContaining({ outputIndex: 1, result: expect.objectContaining({ storagePath: "tenant-a/ai/product-photos/1.jpg" }) }));
    expect(ledger.releasePack).not.toHaveBeenCalled();
  });

  it("marks a pack uncertain when durable outputs cannot be settled", async () => {
    let index = 0;
    const { provider, ledger } = setup(async () => result(++index));
    vi.mocked(ledger.settlePack).mockRejectedValueOnce(new Error("settlement unavailable"));
    await expect(generateProductPhotoPack({ request, provider, ledger, maxPackCostMicros: 30 })).rejects.toThrow("settlement unavailable");
    expect(ledger.recordOutput).toHaveBeenCalledTimes(3);
    expect(ledger.markUncertain).toHaveBeenCalledWith(expect.objectContaining({ reason: "durable outputs exist but settlement failed" }));
    expect(ledger.releasePack).not.toHaveBeenCalled();
  });

  it("releases the whole reservation and returns an error when every attempt is confirmed non-billed", async () => {
    const { provider, ledger } = setup(async () => { throw new ProductImageProviderError("rejected", "not_billed"); });
    await expect(generateProductPhotoPack({ request, provider, ledger, maxPackCostMicros: 30 })).rejects.toThrow("All provider attempts failed");
    expect(ledger.releasePack).toHaveBeenCalledOnce();
    expect(ledger.settlePack).not.toHaveBeenCalled();
  });

  it("blocks before reservation when the provider estimate exceeds the server ceiling", async () => {
    const { provider, ledger } = setup(async () => result(1));
    await expect(generateProductPhotoPack({ request, provider, ledger, maxPackCostMicros: 29 })).rejects.toBeInstanceOf(ProductPhotoPackCostError);
    expect(ledger.reservePack).not.toHaveBeenCalled();
  });
});
