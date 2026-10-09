import "server-only";
import { createAzureFoundryImage, getAzureFoundryImageStatus, AzureFoundryError } from "./azure-foundry";
import { createFalImage, FalImageError, getFalImageStatus } from "./fal";

export class MarketingImageError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}

export type PersistMarketingImage = (image: { bytes: Uint8Array; contentType: "image/png" }) => Promise<string>;

export function decodeAzurePng(base64: string): Uint8Array {
  const bytes = Buffer.from(base64, "base64");
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < pngSignature.length || bytes.length > 10_000_000 || !pngSignature.every((byte, index) => bytes[index] === byte)) {
    throw new MarketingImageError("Azure вернул неподдерживаемый файл изображения.", 502);
  }
  return bytes;
}

export function getMarketingImageStatus(env: NodeJS.ProcessEnv = process.env) {
  const requested = env.AI_IMAGE_PROVIDER?.toLowerCase();
  const azure = getAzureFoundryImageStatus(env);
  const fal = getFalImageStatus(env);
  if (requested === "azure") return { configured: azure.configured, provider: "azure" as const, model: azure.deployment, reason: azure.configured ? null : "azure-image-deployment-not-configured" };
  if (requested === "fal") return { configured: fal.configured, provider: "fal" as const, model: fal.model, reason: fal.configured ? null : "fal-not-configured" };
  return { configured: false, provider: null, model: null, reason: requested ? "unsupported-image-provider" : "explicit-image-provider-selection-required" };
}

export async function createMarketingImage(prompt: string, persistImage?: PersistMarketingImage) {
  const status = getMarketingImageStatus();
  if (!status.configured || !status.provider) throw new MarketingImageError("Image provider is not configured.", 503);
  try {
    if (status.provider === "fal") return { ...(await createFalImage(prompt)), provider: "fal" as const, model: status.model! };
    const result = await createAzureFoundryImage(prompt);
    if (!result.b64_json || !persistImage) throw new MarketingImageError("Для ответа Azure требуется сохранение PNG в хранилище магазина.", 503);
    const imageUrl = await persistImage({ bytes: decodeAzurePng(result.b64_json), contentType: "image/png" });
    if (!imageUrl.startsWith("https://")) throw new MarketingImageError("Сохранённый файл не получил защищённый адрес.", 502);
    return { imageUrl, provider: "azure" as const, model: status.model! };
  } catch (error) {
    if (error instanceof MarketingImageError) throw error;
    if (error instanceof AzureFoundryError || error instanceof FalImageError) throw new MarketingImageError(error.message, error.status);
    throw new MarketingImageError("Image provider request failed.", 502);
  }
}
