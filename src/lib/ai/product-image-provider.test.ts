import { describe, expect, it, vi } from "vitest";
import {
  disabledProductImageProvider,
  generateProductImage,
  ProductImageInProgressError,
  ProductImageProviderError,
  ProductImageUnavailableError,
  type ProductImageProvider,
  type ProductImageRequest,
} from "./product-image-provider";

const request: ProductImageRequest = {
  tenantId: "tenant",
  actorId: "owner",
  idempotencyKey: "00000000-0000-4000-8000-000000000001",
  sourceImage: new Uint8Array([1]),
  instruction: "Improve the light and background without changing the product.",
  merchantApproved: true,
};
const result = {
  imageUrl: "https://example.test/result.webp",
  requestId: "provider-request",
  model: "test",
  version: "1",
  usage: { outputImages: 1 as const, billedAmountMicros: 10 },
  provenance: { kind: "ai-assisted-product-photo" as const, sourcePreserved: true as const, provider: "test" },
};
const capabilities = { enabled: true, provider: "test", model: "test", version: "1", supportsFaithfulProductImprovement: true, maxOutputsPerRequest: 1 as const };

describe("product image provider contract", () => {
  it("is honestly disabled by default and never reserves quota or budget", async () => {
    const reserveBudget = vi.fn();
    await expect(generateProductImage(request, { provider: disabledProductImageProvider(), findCached: async () => null, reserveBudget, commitUsage: vi.fn(), releaseBudget: vi.fn() })).rejects.toBeInstanceOf(ProductImageUnavailableError);
    expect(reserveBudget).not.toHaveBeenCalled();
  });

  it("deduplicates before cost estimation and budget reservation", async () => {
    const provider = { capabilities: () => capabilities, estimateCost: vi.fn(), generate: vi.fn() } satisfies ProductImageProvider;
    const reserveBudget = vi.fn();
    await expect(generateProductImage(request, { provider, findCached: async () => result, reserveBudget, commitUsage: vi.fn(), releaseBudget: vi.fn() })).resolves.toBe(result);
    expect(provider.estimateCost).not.toHaveBeenCalled();
    expect(provider.generate).not.toHaveBeenCalled();
    expect(reserveBudget).not.toHaveBeenCalled();
  });

  it("fails closed when provider cost is unknown", async () => {
    const provider = { capabilities: () => capabilities, estimateCost: async () => ({ currency: "USD" as const, amountMicros: null, basis: "unknown" }), generate: vi.fn() } satisfies ProductImageProvider;
    const reserveBudget = vi.fn();
    await expect(generateProductImage(request, { provider, findCached: async () => null, reserveBudget, commitUsage: vi.fn(), releaseBudget: vi.fn() })).rejects.toBeInstanceOf(ProductImageUnavailableError);
    expect(reserveBudget).not.toHaveBeenCalled();
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it("does not issue a second provider request when the atomic claim is already held", async () => {
    const provider = { capabilities: () => capabilities, estimateCost: async () => ({ currency: "USD" as const, amountMicros: 10, basis: "fixture" }), generate: vi.fn() } satisfies ProductImageProvider;
    await expect(generateProductImage(request, { provider, findCached: async () => null, reserveBudget: async () => ({ reservationId: "same-key", acquired: false }), commitUsage: vi.fn(), releaseBudget: vi.fn() })).rejects.toBeInstanceOf(ProductImageInProgressError);
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it("releases only a provider failure explicitly confirmed as not billed", async () => {
    const provider = { capabilities: () => capabilities, estimateCost: async () => ({ currency: "USD" as const, amountMicros: 10, basis: "fixture" }), generate: vi.fn(async () => { throw new ProductImageProviderError("rejected before execution", "not_billed"); }) } satisfies ProductImageProvider;
    const releaseBudget = vi.fn();
    const markUncertain = vi.fn();
    await expect(generateProductImage(request, { provider, findCached: async () => null, reserveBudget: async () => ({ reservationId: "reserved" }), commitUsage: vi.fn(), releaseBudget, markUncertain })).rejects.toThrow("rejected");
    expect(releaseBudget).toHaveBeenCalledWith("reserved");
    expect(markUncertain).not.toHaveBeenCalled();
  });

  it("keeps an ambiguous provider failure claimed to prevent a paid duplicate", async () => {
    const provider = { capabilities: () => capabilities, estimateCost: async () => ({ currency: "USD" as const, amountMicros: 10, basis: "fixture" }), generate: vi.fn(async () => { throw new Error("timeout"); }) } satisfies ProductImageProvider;
    const releaseBudget = vi.fn();
    const markUncertain = vi.fn();
    await expect(generateProductImage(request, { provider, findCached: async () => null, reserveBudget: async () => ({ reservationId: "reserved" }), commitUsage: vi.fn(), releaseBudget, markUncertain })).rejects.toThrow("timeout");
    expect(releaseBudget).not.toHaveBeenCalled();
    expect(markUncertain).toHaveBeenCalledOnce();
  });

  it("does not release after provider success when usage persistence fails", async () => {
    const provider = { capabilities: () => capabilities, estimateCost: async () => ({ currency: "USD" as const, amountMicros: 10, basis: "fixture" }), generate: async () => result } satisfies ProductImageProvider;
    const releaseBudget = vi.fn();
    const markUncertain = vi.fn();
    await expect(generateProductImage(request, { provider, findCached: async () => null, reserveBudget: async () => ({ reservationId: "reserved" }), commitUsage: async () => { throw new Error("db unavailable"); }, releaseBudget, markUncertain })).rejects.toThrow("db unavailable");
    expect(releaseBudget).not.toHaveBeenCalled();
    expect(markUncertain).toHaveBeenCalledWith(expect.objectContaining({ reservationId: "reserved" }));
  });
});
