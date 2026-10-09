import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { decodeAzurePng, getMarketingImageStatus } from "./marketing-image-provider";

const azure = {
  NODE_ENV: "test",
  AI_IMAGE_PROVIDER: "azure",
  AZURE_AI_FOUNDRY_ENDPOINT: "https://example.services.ai.azure.com/openai/v1",
  AZURE_AI_FOUNDRY_API_KEY: "server-only-key-that-is-long-enough",
  AZURE_AI_FOUNDRY_IMAGE_DEPLOYMENT: "confirmed-image-deployment",
  FAL_KEY: "fallback-must-not-win",
} as unknown as NodeJS.ProcessEnv;

describe("marketing image provider selection", () => {
  it("uses Azure when explicitly selected instead of requiring FAL", () => {
    expect(getMarketingImageStatus(azure)).toMatchObject({ configured: true, provider: "azure", model: "confirmed-image-deployment" });
  });

  it("fails closed when Azure is selected but its deployment is absent", () => {
    expect(getMarketingImageStatus({ NODE_ENV: "test", AI_IMAGE_PROVIDER: "azure", FAL_KEY: "present" })).toMatchObject({ configured: false, provider: "azure", reason: "azure-image-deployment-not-configured" });
  });

  it("does not spend through FAL as an implicit fallback", () => {
    expect(getMarketingImageStatus({ NODE_ENV: "test", FAL_KEY: "present" })).toMatchObject({ configured: false, provider: null, reason: "explicit-image-provider-selection-required" });
  });

  it("refuses malformed or oversized Azure bytes before any storage upload", () => {
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2]);
    expect(decodeAzurePng(png.toString("base64"))).toEqual(png);
    expect(() => decodeAzurePng(Buffer.from("not a png").toString("base64"))).toThrow("неподдерживаемый файл");
    expect(() => decodeAzurePng(Buffer.concat([png, Buffer.alloc(10_000_000)]).toString("base64"))).toThrow("неподдерживаемый файл");
  });
});
