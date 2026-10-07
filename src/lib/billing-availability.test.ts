import { describe, expect, it } from "vitest";
import { getSaasBillingAvailability } from "./billing-availability";

describe("SaaS billing release gate", () => {
  it("keeps confirmed KZT pricing provider-neutral and unavailable", () => {
    expect(getSaasBillingAvailability()).toEqual(expect.objectContaining({ available: false, provider: null, candidate: null, currency: "KZT" }));
  });
});
