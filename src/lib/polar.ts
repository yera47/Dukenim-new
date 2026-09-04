import "server-only";
import { Polar } from "@polar-sh/sdk";

export { getPolarProductId, getPolarAiCreditsProductId, planFromPolarProductId, isPolarConfigured, isPolarWebhookConfigured, type BillingPeriod } from "@/lib/polar-plan";

let cachedClient: Polar | null = null;
export function getPolarClient(): Polar {
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();
  if (!accessToken) throw new Error("Polar не настроен: POLAR_ACCESS_TOKEN отсутствует.");
  if (!cachedClient) cachedClient = new Polar({ accessToken, server: process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production" });
  return cachedClient;
}
