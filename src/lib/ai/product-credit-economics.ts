export const DRAFT_CLIENT_BUDGET_USD = 10;
export const DRAFT_COST_RESERVE_RATE = 0.3;

export type DraftProviderEconomics = {
  provider: "fal" | "azure";
  model: string;
  resolution: "1MP";
  maxReferences: number | null;
  usdPerSuccessfulOutput: number | null;
  conservativeOutputAllowance: number | null;
  active: false;
  evidence: "owner-draft" | "unknown";
};

export const FAL_FLUX_2_PRO_DRAFT: DraftProviderEconomics = {
  provider: "fal",
  model: "FLUX.2 Pro",
  resolution: "1MP",
  maxReferences: 3,
  usdPerSuccessfulOutput: 0.075,
  conservativeOutputAllowance: 90,
  active: false,
  evidence: "owner-draft",
};

export const FAL_KLEIN_4B_DRAFT: DraftProviderEconomics = {
  provider: "fal",
  model: "FLUX.2 Klein 4B",
  resolution: "1MP",
  maxReferences: 3,
  usdPerSuccessfulOutput: 0.017,
  conservativeOutputAllowance: 400,
  active: false,
  evidence: "owner-draft",
};

export const AZURE_FLUX_2_PRO_UNKNOWN: DraftProviderEconomics = {
  provider: "azure",
  model: "FLUX.2 Pro",
  resolution: "1MP",
  maxReferences: null,
  usdPerSuccessfulOutput: null,
  conservativeOutputAllowance: null,
  active: false,
  evidence: "unknown",
};

export const DRAFT_TOP_UPS = [
  { credits: 30, retailPrice: null, live: false },
  { credits: 90, retailPrice: null, live: false },
] as const;

export function draftProductsFromCredits(credits: number, outputsPerProduct: 2 | 3 | 4 | 5) {
  return { products: Math.floor(Math.max(0, credits) / outputsPerProduct), remainderCredits: Math.max(0, credits) % outputsPerProduct };
}

export function falProBudgetMath() {
  const spendable = DRAFT_CLIENT_BUDGET_USD * (1 - DRAFT_COST_RESERVE_RATE);
  return {
    spendableUsd: spendable,
    mathematicalOutputs: Math.floor(spendable / FAL_FLUX_2_PRO_DRAFT.usdPerSuccessfulOutput!),
    conservativeOutputs: FAL_FLUX_2_PRO_DRAFT.conservativeOutputAllowance!,
  };
}
