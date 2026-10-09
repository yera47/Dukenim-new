import type { Plan } from "@/lib/plans";

export type ProductAiEntitlementInput = {
  plan: Plan;
  nextPlan: Plan | null;
  status: "active" | "paused" | "trial";
  trialEndsAt: string | null;
  premiumTrialJobStarted: boolean;
};

export type ProductAiCapability = "quote" | "reserve" | "job" | "topup";

function isPremium(plan: Plan | null) { return plan === "standard" || plan === "pro"; }

export function productAiAccess(input: ProductAiEntitlementInput, capability: ProductAiCapability, now = Date.now()) {
  const paidPremium = input.status === "active" && isPremium(input.plan);
  if (paidPremium) return { allowed: true, source: "paid-premium" as const, reason: "ready" as const };
  if (capability === "topup") return { allowed: false, source: null, reason: "paid-premium-required" as const };
  const trialEnd = input.trialEndsAt ? Date.parse(input.trialEndsAt) : Number.NaN;
  const premiumTrial = input.status === "trial" && Number.isFinite(trialEnd) && trialEnd > now && isPremium(input.nextPlan ?? input.plan);
  if (!premiumTrial) return { allowed: false, source: null, reason: "premium-required" as const };
  if (input.premiumTrialJobStarted) return { allowed: false, source: null, reason: "premium-trial-job-used" as const };
  return { allowed: true, source: "premium-trial-one-job" as const, reason: "ready" as const };
}

export function sameTrialJobCanRetry(input: { sameReservation: boolean; attemptCount: number; terminal: boolean }) {
  return input.sameReservation && !input.terminal && input.attemptCount < 3;
}
