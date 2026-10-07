import { describe, expect, it } from "vitest";
import { AZURE_FLUX_2_PRO_UNKNOWN, DRAFT_TOP_UPS, FAL_KLEIN_4B_DRAFT, draftProductsFromCredits, falProBudgetMath } from "./product-credit-economics";

describe("draft product-credit economics", () => {
  it("keeps the FAL arithmetic explicit and conservative", () => {
    expect(falProBudgetMath()).toEqual({ spendableUsd: 7, mathematicalOutputs: 93, conservativeOutputs: 90 });
    expect([2, 3, 4, 5].map(count => draftProductsFromCredits(90, count as 2 | 3 | 4 | 5))).toEqual([
      { products: 45, remainderCredits: 0 },
      { products: 30, remainderCredits: 0 },
      { products: 22, remainderCredits: 2 },
      { products: 18, remainderCredits: 0 },
    ]);
  });

  it("does not activate draft provider prices or turn Azure unknown pricing into a guarantee", () => {
    expect(FAL_KLEIN_4B_DRAFT).toMatchObject({ usdPerSuccessfulOutput: 0.017, conservativeOutputAllowance: 400, active: false });
    expect(AZURE_FLUX_2_PRO_UNKNOWN).toMatchObject({ usdPerSuccessfulOutput: null, conservativeOutputAllowance: null, active: false });
  });

  it("keeps top-ups disabled while retail price and verified purchase flow are absent", () => {
    expect(DRAFT_TOP_UPS).toEqual([{ credits: 30, retailPrice: null, live: false }, { credits: 90, retailPrice: null, live: false }]);
  });
});
