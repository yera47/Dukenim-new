import type { Plan } from "@/lib/plans";

export type ProductAiEntitlementInput = {
  plan: Plan;
  nextPlan: Plan | null;
  status: "active" | "paused" | "trial";
  trialEndsAt: string | null;
  premiumTrialJobStarted: boolean;
};

export type ProductAiCapability = "quote" | "reserve" | "job" | "topup";

export function productAiAccess(input: ProductAiEntitlementInput, capability: ProductAiCapability, now = Date.now()) {
  const paidCatalog = input.status === "active";
  if (paidCatalog) return { allowed: true, source: "paid-catalog" as const, reason: "ready" as const };
  if (capability === "topup") return { allowed: false, source: null, reason: "paid-plan-required" as const };
  const trialEnd = input.trialEndsAt ? Date.parse(input.trialEndsAt) : Number.NaN;
  const activeTrial = input.status === "trial" && Number.isFinite(trialEnd) && trialEnd > now;
  if (!activeTrial) return { allowed: false, source: null, reason: "active-trial-or-paid-plan-required" as const };
  if (input.premiumTrialJobStarted) return { allowed: false, source: null, reason: "trial-credit-limit-reached" as const };
  return { allowed: true, source: "trial-one-job" as const, reason: "ready" as const };
}

export function sameTrialJobCanRetry(input: { sameReservation: boolean; attemptCount: number; terminal: boolean }) {
  return input.sameReservation && !input.terminal && input.attemptCount < 3;
}
