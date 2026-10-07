export const AI_OUTPUT_COUNT_MIN = 2;
export const AI_OUTPUT_COUNT_MAX = 5;
export const AI_OUTPUT_COUNT_DEFAULT = 3;

export type ProductCreditQuoteInput = {
  outputCount: number;
  balance: number;
  costPerOutput: number | null;
  model: string | null;
  resolution: string | null;
  referenceMegapixels: number | null;
  killSwitch: boolean;
};

export type ProductCreditQuote = {
  enabled: boolean;
  outputCount: number;
  totalCredits: number | null;
  remainingCredits: number;
  affordable: boolean;
  reason: "ready" | "provider-disabled" | "pricing-unconfirmed" | "invalid-count" | "insufficient-credits";
};

export function allocateCreditReservation(totalCredits: number, allowanceAvailable: number, purchasedAvailable: number) {
  const total = Number.isSafeInteger(totalCredits) && totalCredits > 0 ? totalCredits : 0;
  const allowance = Number.isSafeInteger(allowanceAvailable) && allowanceAvailable > 0 ? allowanceAvailable : 0;
  const purchased = Number.isSafeInteger(purchasedAvailable) && purchasedAvailable > 0 ? purchasedAvailable : 0;
  if (allowance + purchased < total) return null;
  const fromAllowance = Math.min(total, allowance);
  return { fromAllowance, fromPurchased: total - fromAllowance };
}

export function quoteProductCredits(input: ProductCreditQuoteInput): ProductCreditQuote {
  const balance = Number.isSafeInteger(input.balance) && input.balance >= 0 ? input.balance : 0;
  if (!Number.isInteger(input.outputCount) || input.outputCount < AI_OUTPUT_COUNT_MIN || input.outputCount > AI_OUTPUT_COUNT_MAX) {
    return { enabled: false, outputCount: input.outputCount, totalCredits: null, remainingCredits: balance, affordable: false, reason: "invalid-count" };
  }
  if (input.killSwitch) return { enabled: false, outputCount: input.outputCount, totalCredits: null, remainingCredits: balance, affordable: false, reason: "provider-disabled" };
  if (!input.model || !input.resolution || input.referenceMegapixels === null || !Number.isSafeInteger(input.costPerOutput) || input.costPerOutput! <= 0) {
    return { enabled: false, outputCount: input.outputCount, totalCredits: null, remainingCredits: balance, affordable: false, reason: "pricing-unconfirmed" };
  }
  const totalCredits = input.outputCount * input.costPerOutput!;
  const affordable = balance >= totalCredits;
  return { enabled: affordable, outputCount: input.outputCount, totalCredits, remainingCredits: affordable ? balance - totalCredits : balance, affordable, reason: affordable ? "ready" : "insufficient-credits" };
}

export function describePartialCreditSettlement(requested: number, succeeded: number) {
  const safeSucceeded = Math.max(0, Math.min(requested, Math.trunc(succeeded)));
  const failed = Math.max(0, requested - safeSucceeded);
  return { requested, succeeded: safeSucceeded, failed, isPartial: safeSucceeded > 0 && failed > 0 };
}
