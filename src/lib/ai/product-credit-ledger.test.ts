import { describe, expect, it } from "vitest";
import { AI_OUTPUT_COUNT_DEFAULT, allocateCreditReservation, describePartialCreditSettlement, quoteProductCredits } from "./product-credit-ledger";

const base = { outputCount: AI_OUTPUT_COUNT_DEFAULT, balance: 30, costPerOutput: 4, model: "fixture", resolution: "1mp", referenceMegapixels: 3, killSwitch: false };

describe("AI product-credit quote", () => {
  it("defaults product UX to three outputs and supports only 2-5", () => {
    expect(AI_OUTPUT_COUNT_DEFAULT).toBe(3);
    expect(quoteProductCredits({ ...base, outputCount: 1 }).reason).toBe("invalid-count");
    expect(quoteProductCredits({ ...base, outputCount: 6 }).reason).toBe("invalid-count");
  });
  it("fails closed without confirmed server pricing or when killed", () => {
    expect(quoteProductCredits({ ...base, costPerOutput: null }).reason).toBe("pricing-unconfirmed");
    expect(quoteProductCredits({ ...base, killSwitch: true }).reason).toBe("provider-disabled");
  });
  it("quotes integer product credits and never makes the balance negative", () => {
    expect(quoteProductCredits(base)).toMatchObject({ totalCredits: 12, remainingCredits: 18, affordable: true });
    expect(quoteProductCredits({ ...base, balance: 11 })).toMatchObject({ totalCredits: 12, remainingCredits: 11, affordable: false, reason: "insufficient-credits" });
  });
  it("reports partial success without charging failed outputs in the UI model", () => {
    expect(describePartialCreditSettlement(5, 3)).toEqual({ requested: 5, succeeded: 3, failed: 2, isPartial: true });
  });
  it("uses periodic allowance first and preserves the distinct purchased balance", () => {
    expect(allocateCreditReservation(3, 2, 10)).toEqual({ fromAllowance: 2, fromPurchased: 1 });
    expect(allocateCreditReservation(5, 2, 2)).toBeNull();
  });
});
