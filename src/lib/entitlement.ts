import type { Plan } from "@/lib/plans";

export type TenantEntitlement = { active: boolean; plan: Plan; trialActive: boolean; expired: boolean };
export type EntitlementInput = { plan: Plan; next_plan: Plan | null; status: "active" | "paused" | "trial"; trial_ends_at: string | null };

// Trial is a neutral full-access period (owner decision, 2026-08-18): while it is running,
// entitlement is based on the plan the owner is heading toward (`next_plan`), not the
// placeholder `basic` plan stored on the row. Once the trial ends without a paid
// subscription, entitlement collapses to the stored `plan` and `expired` becomes true.
export function computeEntitlement(tenant: EntitlementInput, now = Date.now()): TenantEntitlement {
  if (tenant.status !== "trial") return { active: tenant.status === "active", plan: tenant.plan, trialActive: false, expired: false };
  const trialEnd = tenant.trial_ends_at ? new Date(tenant.trial_ends_at).getTime() : Number.NaN;
  const trialActive = Number.isFinite(trialEnd) && trialEnd > now;
  return { active: trialActive, plan: trialActive ? tenant.next_plan ?? tenant.plan : tenant.plan, trialActive, expired: !trialActive };
}
