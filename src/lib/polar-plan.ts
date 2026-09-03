import type { Plan } from "@/lib/plans";

export type BillingPeriod = "monthly" | "annual";

const productEnvKey: Record<"basic" | "standard", Record<BillingPeriod, string>> = {
  basic: { monthly: "POLAR_BASIC_MONTHLY_PRODUCT_ID", annual: "POLAR_BASIC_ANNUAL_PRODUCT_ID" },
  standard: { monthly: "POLAR_STANDARD_MONTHLY_PRODUCT_ID", annual: "POLAR_STANDARD_ANNUAL_PRODUCT_ID" },
};

function normalizedPlan(plan: Plan): "basic" | "standard" {
  return plan === "basic" ? "basic" : "standard";
}

export function getPolarProductId(plan: Plan, period: BillingPeriod): string | null {
  const key = productEnvKey[normalizedPlan(plan)][period];
  return process.env[key]?.trim() || null;
}

export function planFromPolarProductId(productId: string): Plan | null {
  if (productId === process.env.POLAR_BASIC_MONTHLY_PRODUCT_ID?.trim() || productId === process.env.POLAR_BASIC_ANNUAL_PRODUCT_ID?.trim()) return "basic";
  if (productId === process.env.POLAR_STANDARD_MONTHLY_PRODUCT_ID?.trim() || productId === process.env.POLAR_STANDARD_ANNUAL_PRODUCT_ID?.trim()) return "standard";
  return null;
}

// Checkout needs the access token plus the one product id for the requested plan/period.
// The webhook route additionally needs POLAR_WEBHOOK_SECRET, checked separately, so a
// misconfigured webhook never blocks a correctly configured checkout and vice versa.
export function isPolarConfigured(plan?: Plan, period?: BillingPeriod): boolean {
  if (!process.env.POLAR_ACCESS_TOKEN?.trim()) return false;
  if (plan && period) return Boolean(getPolarProductId(plan, period));
  return Boolean(
    process.env.POLAR_BASIC_MONTHLY_PRODUCT_ID?.trim() &&
      process.env.POLAR_BASIC_ANNUAL_PRODUCT_ID?.trim() &&
      process.env.POLAR_STANDARD_MONTHLY_PRODUCT_ID?.trim() &&
      process.env.POLAR_STANDARD_ANNUAL_PRODUCT_ID?.trim(),
  );
}

export function isPolarWebhookConfigured(): boolean {
  return Boolean(process.env.POLAR_WEBHOOK_SECRET?.trim());
}
