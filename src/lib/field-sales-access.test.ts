import { describe, expect, it } from "vitest";
import { canUseFieldSales, FIELD_SALES_TENANT_ID } from "./field-sales-access";

describe("field sales access", () => {
  it("allows the platform superadmin", () => {
    expect(canUseFieldSales("superadmin", null)).toBe(true);
  });

  it("allows only the internal Dukenim owner tenant", () => {
    expect(canUseFieldSales("owner", FIELD_SALES_TENANT_ID)).toBe(true);
    expect(canUseFieldSales("owner", "00000000-0000-4000-8000-000000000000")).toBe(false);
    expect(canUseFieldSales("customer", FIELD_SALES_TENANT_ID)).toBe(false);
  });
});
