import { describe, expect, it } from "vitest";
import { legalPolicyStatus, marketplaceSeparation, operatorDetails, subscriptionTerms } from "./legal-policy";

describe("legal policy contract", () => {
  it("keeps all legacy plan rows mapped to the single confirmed monthly KZT price", () => {
    expect(subscriptionTerms.plans.basic.price).toBe(24_900);
    expect(subscriptionTerms.plans.standard.price).toBe(24_900);
    expect(subscriptionTerms.plans.pro.price).toBe(24_900);
    expect(subscriptionTerms.billingPeriod).toBe("месяц");
  });

  it("does not express an unconditional no-refund rule", () => {
    expect(subscriptionTerms.generalRefundRule).toContain("В пределах, допускаемых применимым законодательством");
    expect(subscriptionTerms.mandatoryExceptions).toHaveLength(5);
    expect(subscriptionTerms.cancellation).toContain("будущие списания");
    expect(subscriptionTerms.generalRefundRule).toContain("Обязательные права по закону сохраняются");
  });

  it("separates SaaS billing from merchant sales and stays draft", () => {
    expect(marketplaceSeparation).toContain("соответствующего продавца");
    expect(legalPolicyStatus.isPublicationReady).toBe(false);
    expect(operatorDetails.supportWhatsAppUrl).toBe("https://wa.me/77025224262");
  });
});
