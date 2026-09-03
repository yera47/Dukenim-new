import { describe, expect, it } from "vitest";
import { computeEntitlement } from "./entitlement";

const NOW = new Date("2026-09-03T00:00:00Z").getTime();

describe("computeEntitlement", () => {
  it("grants the picked next_plan tier during an active trial", () => {
    const result = computeEntitlement({ plan: "basic", next_plan: "standard", status: "trial", trial_ends_at: new Date(NOW + 86_400_000).toISOString() }, NOW);
    expect(result).toEqual({ active: true, plan: "standard", trialActive: true, expired: false });
  });

  it("falls back to the stored plan once the trial has expired", () => {
    const result = computeEntitlement({ plan: "basic", next_plan: "standard", status: "trial", trial_ends_at: new Date(NOW - 1000).toISOString() }, NOW);
    expect(result).toEqual({ active: false, plan: "basic", trialActive: false, expired: true });
  });

  it("fails closed when a trial has no end date", () => {
    const result = computeEntitlement({ plan: "basic", next_plan: "standard", status: "trial", trial_ends_at: null }, NOW);
    expect(result.active).toBe(false);
    expect(result.expired).toBe(true);
  });

  it("uses the stored plan directly once a paid subscription is active", () => {
    const result = computeEntitlement({ plan: "standard", next_plan: null, status: "active", trial_ends_at: null }, NOW);
    expect(result).toEqual({ active: true, plan: "standard", trialActive: false, expired: false });
  });

  it("is inactive while paused, regardless of stored plan", () => {
    const result = computeEntitlement({ plan: "standard", next_plan: null, status: "paused", trial_ends_at: null }, NOW);
    expect(result.active).toBe(false);
  });
});
