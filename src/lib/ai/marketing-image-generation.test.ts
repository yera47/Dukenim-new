import { afterEach, describe, expect, it, vi } from "vitest";

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2]);
const azure = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./azure-foundry", () => ({
  createAzureFoundryImage: azure.generate,
  getAzureFoundryImageStatus: () => ({ configured: true, deployment: "image-deployment" }),
  AzureFoundryError: class extends Error {},
}));
vi.mock("./fal", () => ({ createFalImage: vi.fn(), getFalImageStatus: () => ({ configured: false, model: null }), FalImageError: class extends Error {} }));
import { createMarketingImage } from "./marketing-image-provider";

const previousProvider = process.env.AI_IMAGE_PROVIDER;
afterEach(() => {
  if (previousProvider === undefined) delete process.env.AI_IMAGE_PROVIDER;
  else process.env.AI_IMAGE_PROVIDER = previousProvider;
  vi.clearAllMocks();
});

describe("Azure banner persistence", () => {
  it("saves decoded PNG before returning a merchant asset URL", async () => {
    process.env.AI_IMAGE_PROVIDER = "azure";
    azure.generate.mockResolvedValue({ b64_json: png.toString("base64") });
    const persist = vi.fn(async ({ bytes }: { bytes: Uint8Array }) => {
      expect(Buffer.from(bytes)).toEqual(png);
      return "https://example.test/storage/banner.png";
    });
    expect(await createMarketingImage("Светлая обложка", persist)).toMatchObject({ imageUrl: "https://example.test/storage/banner.png", provider: "azure" });
    expect(persist).toHaveBeenCalledOnce();
  });

  it("fails closed when durable storage is not available", async () => {
    process.env.AI_IMAGE_PROVIDER = "azure";
    azure.generate.mockResolvedValue({ b64_json: png.toString("base64") });
    await expect(createMarketingImage("Светлая обложка")).rejects.toThrow("сохранение PNG");
  });
});
