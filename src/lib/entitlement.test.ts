import { describe, expect, it } from "vitest";
import { computeEntitlement, type EntitlementInput } from "./entitlement";

const now = Date.parse("2026-09-06T12:00:00Z");
const trial: EntitlementInput = { plan: "basic", next_plan: "standard", status: "trial", trial_ends_at: "2026-09-07T12:00:00Z" };

describe("tenant entitlement", () => {
  it("uses the selected plan only during a valid trial", () => {
    expect(computeEntitlement(trial, now)).toEqual({ active: true, plan: "standard", trialActive: true, expired: false });
    expect(computeEntitlement({ ...trial, next_plan: "basic" }, now).plan).toBe("basic");
  });
  it.each([null, "invalid", "2026-09-06T12:00:00Z", "2026-09-05T12:00:00Z"])("fails closed for an ended or invalid trial: %s", trial_ends_at => {
    expect(computeEntitlement({ ...trial, trial_ends_at }, now)).toEqual({ active: false, plan: "basic", trialActive: false, expired: true });
  });
  it("does not let a future trial date reactivate a paused tenant", () => {
    expect(computeEntitlement({ ...trial, status: "paused" }, now).active).toBe(false);
  });
  it("uses the paid plan rather than a pending upgrade", () => {
    expect(computeEntitlement({ ...trial, status: "active" }, now)).toEqual({ active: true, plan: "basic", trialActive: false, expired: false });
  });
});
