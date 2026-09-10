import { describe, expect, it } from "vitest";
import { formatCustomerDeliveryAddress, isCustomerDeliveryAddressReady } from "./customer-delivery-address";
const address = { street: " Алматы, Абая ", house: " 10А ", apartment: "", entrance: "", floor: "", comment: "" };
describe("customer delivery address", () => {
  it("requires street and house, not apartment for private houses", () => {
    expect(isCustomerDeliveryAddressReady(address)).toBe(true);
    expect(isCustomerDeliveryAddressReady({ ...address, house: " " })).toBe(false);
    expect(isCustomerDeliveryAddressReady({ ...address, street: " " })).toBe(false);
  });
  it("keeps labelled details in the existing immutable order address", () => {
    expect(formatCustomerDeliveryAddress({ ...address, apartment: "12", entrance: "2", floor: "4", comment: "Позвоните у входа" }))
      .toBe("Алматы, Абая, дом 10А, кв./офис 12, подъезд 2, этаж 4, Комментарий: Позвоните у входа");
  });
  it("rejects combined addresses beyond the API limit without truncation", () => {
    expect(isCustomerDeliveryAddressReady({ ...address, comment: "я".repeat(500) })).toBe(false);
  });
});
