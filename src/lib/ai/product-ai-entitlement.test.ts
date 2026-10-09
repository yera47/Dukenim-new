import { describe, expect, it } from "vitest";
import { productAiAccess, sameTrialJobCanRetry } from "./product-ai-entitlement";

const premiumTrial = { plan: "basic" as const, nextPlan: "basic" as const, status: "trial" as const, trialEndsAt: "2026-10-08T00:00:00Z", premiumTrialJobStarted: false };
const now = Date.parse("2026-10-07T12:00:00Z");

describe("server product-AI entitlement", () => {
  it("allows the unified trial for legacy basic tenants, but not credit top-ups", () => {
    expect(productAiAccess(premiumTrial, "quote", now).allowed).toBe(true);
    expect(productAiAccess(premiumTrial, "job", now).allowed).toBe(true);
    expect(productAiAccess(premiumTrial, "topup", now).reason).toBe("paid-plan-required");
  });
  it("allows the trial job once across quote/reserve/job but never a top-up", () => {
    expect(productAiAccess(premiumTrial, "quote", now).source).toBe("trial-one-job");
    expect(productAiAccess(premiumTrial, "reserve", now).allowed).toBe(true);
    expect(productAiAccess(premiumTrial, "job", now).allowed).toBe(true);
    expect(productAiAccess(premiumTrial, "topup", now).allowed).toBe(false);
    expect(productAiAccess({ ...premiumTrial, premiumTrialJobStarted: true }, "job", now).reason).toBe("trial-credit-limit-reached");
  });
  it("allows all paid legacy plan rows and bounds a technical retry to the same reservation", () => {
    expect(productAiAccess({ ...premiumTrial, plan: "basic", status: "active", premiumTrialJobStarted: true }, "topup", now).allowed).toBe(true);
    expect(sameTrialJobCanRetry({ sameReservation: true, attemptCount: 2, terminal: false })).toBe(true);
    expect(sameTrialJobCanRetry({ sameReservation: false, attemptCount: 0, terminal: false })).toBe(false);
    expect(sameTrialJobCanRetry({ sameReservation: true, attemptCount: 3, terminal: false })).toBe(false);
  });
});
