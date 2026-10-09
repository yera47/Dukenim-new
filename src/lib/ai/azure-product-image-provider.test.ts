import { describe, expect, it, vi } from "vitest";
import { createAzureFlux2Transport, createAzureProductImageProvider, downloadAzureOutput, getAzureProductImageConfig } from "./azure-product-image-provider";

const configured = {
  NODE_ENV: "test",
  AZURE_AI_FOUNDRY_ENDPOINT: "https://example.services.ai.azure.com",
  AZURE_AI_FOUNDRY_API_KEY: "server-only-key-that-is-long-enough",
  AZURE_AI_FLUX_DEPLOYMENT: "FLUX.2-pro",
  AZURE_AI_FLUX_ENDPOINT: "https://example.services.ai.azure.com",
  AZURE_AI_IMAGE_SUPPORTS_REFERENCE: "true",
  AZURE_AI_IMAGE_ESTIMATED_USD_MICROS: "25000",
  AZURE_AI_IMAGE_TIMEOUT_MS: "30000",
} as unknown as NodeJS.ProcessEnv;
const request = {
  tenantId: "tenant-a", actorId: "owner-a", idempotencyKey: "00000000-0000-4000-8000-000000000001",
  sourceImage: new Uint8Array([1, 2, 3]), references: [{ kind: "logo" as const, image: new Uint8Array([4]) }],
  brandContext: { palette: ["#ed8b00"], category: "food" }, instruction: "Improve only the light and background.", merchantApproved: true as const,
};

describe("Azure product image provider", () => {
  it("fails closed without an explicit reference endpoint, capability and cost ceiling", () => {
    expect(getAzureProductImageConfig({ NODE_ENV: "test", AZURE_AI_FOUNDRY_ENDPOINT: configured.AZURE_AI_FOUNDRY_ENDPOINT })).toMatchObject({ configured: false, config: null });
    expect(createAzureProductImageProvider({ env: configured }).capabilities().enabled).toBe(false);
  });
  it("passes tenant-scoped references to an injected transport and returns a review copy", async () => {
    const transport = vi.fn(async () => ({ imageUrl: "https://example.test/generated.webp", storagePath: "tenant-a/ai/product-photos/generated.webp", requestId: "azure-request", billedAmountMicros: 20000, modelVersion: "confirmed-version" }));
    const audit = vi.fn();
    const provider = createAzureProductImageProvider({ env: configured, transport, audit });
    await expect(provider.estimateCost(request)).resolves.toMatchObject({ amountMicros: 25000 });
    const result = await provider.generate(request);
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ request, config: expect.objectContaining({ deployment: "FLUX.2-pro" }), signal: expect.any(AbortSignal) }));
    expect(result.provenance).toMatchObject({ sourcePreserved: true, disposition: "review-copy" });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-a", referenceKinds: ["logo"], billedAmountMicros: 20000, outcome: "succeeded" }));
    expect(JSON.stringify(audit.mock.calls)).not.toContain("server-only-key");
  });
  it("rejects a charge above the configured ceiling without logging image bytes", async () => {
    const audit = vi.fn();
    const provider = createAzureProductImageProvider({ env: configured, audit, transport: async () => ({ imageUrl: "https://example.test/generated.webp", storagePath: "tenant-a/ai/product-photos/generated.webp", requestId: "azure-request", billedAmountMicros: 25001 }) });
    await expect(provider.generate(request)).rejects.toThrow("validation");
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: "failed", billedAmountMicros: null }));
    expect(JSON.stringify(audit.mock.calls)).not.toContain("1,2,3");
  });

  it("implements the documented FLUX.2-pro multi-reference JSON contract without a live request", async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
    const fetcher = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => { void _url; void _init; return new Response(JSON.stringify({ data: [{ b64_json: jpeg.toString("base64") }] }), { status: 200, headers: { "x-request-id": "azure-flux-request" } }); });
    const persistOutput = vi.fn(async () => ({ imageUrl: "https://storage.example.test/tenant-a/review-copy.jpeg", storagePath: "tenant-a/ai/product-photos/review-copy.jpeg" }));
    const status = getAzureProductImageConfig(configured);
    if (!status.configured) throw new Error("fixture must configure the adapter");
    const result = await createAzureFlux2Transport({ fetcher, persistOutput })({ config: status.config, request, signal: new AbortController().signal });
    const [url, init] = fetcher.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(url).toBe("https://example.services.ai.azure.com/providers/blackforestlabs/v1/flux-2-pro?api-version=preview");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer server-only-key-that-is-long-enough", "Idempotency-Key": request.idempotencyKey });
    expect(body).toMatchObject({ model: "FLUX.2-pro", input_image: Buffer.from(request.sourceImage).toString("base64"), input_image_2: Buffer.from(request.references![0].image).toString("base64"), num_images: 1 });
    expect(persistOutput).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-a", idempotencyKey: request.idempotencyKey, contentType: "image/jpeg" }));
    expect(result).toMatchObject({ imageUrl: "https://storage.example.test/tenant-a/review-copy.jpeg", requestId: "azure-flux-request", billedAmountMicros: 25000 });
  });

  it("downloads a provider URL through a bounded transport before durable storage", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 1, 2, 0xff, 0xd9]);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: [{ url: "https://delivery.example.test/output.jpg" }] }), { status: 200 }));
    const downloadOutput = vi.fn(async () => jpeg);
    const persistOutput = vi.fn(async () => ({ imageUrl: "https://signed.storage.test/output", storagePath: "tenant-a/ai/product-photos/output.jpg" }));
    const status = getAzureProductImageConfig(configured);
    if (!status.configured) throw new Error("fixture must configure the adapter");
    await createAzureFlux2Transport({ fetcher, downloadOutput, persistOutput })({ config: status.config, request, signal: new AbortController().signal });
    expect(downloadOutput).toHaveBeenCalledWith("https://delivery.example.test/output.jpg", expect.any(AbortSignal));
    expect(persistOutput).toHaveBeenCalledWith(expect.objectContaining({ bytes: jpeg }));
  });

  it("blocks private or non-JPEG provider URLs", async () => {
    await expect(downloadAzureOutput("http://127.0.0.1/image.jpg", new AbortController().signal, vi.fn())).rejects.toThrow("unsafe");
    const fetcher = vi.fn(async () => new Response("not jpeg", { status: 200, headers: { "content-type": "text/plain" } }));
    await expect(downloadAzureOutput("https://delivery.example.test/image.jpg", new AbortController().signal, fetcher)).rejects.toThrow("validation");
  });
});
