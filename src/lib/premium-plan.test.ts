import { describe, expect, it } from "vitest";
import { premiumDraft } from "./premium-plan";

describe("premium plan", () => {
  it("uses the owner-confirmed monthly 35,000 KZT offer", () => {
    expect(premiumDraft({ NODE_ENV: "test", AI_PHOTO_PACKS_MONTHLY: "90" } as NodeJS.ProcessEnv)).toMatchObject({
      priceKzt: 35_000,
      billingPeriod: "month",
      periodStatus: "monthly_confirmed",
      photoPackLimit: null,
    });
  });
  it("does not turn a conditional image example into a guaranteed live pack", () => {
    expect(premiumDraft({ NODE_ENV: "test", AI_PHOTO_PACKS_MONTHLY: "90" } as NodeJS.ProcessEnv).photoPackLimit).toBeNull();
  });
});
