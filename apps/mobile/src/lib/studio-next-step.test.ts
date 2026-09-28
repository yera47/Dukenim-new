import { describe, expect, it } from "vitest";
import { studioNextStep, type StudioReadiness } from "./studio-next-step";
import type { OwnerStore } from "./owner";

const store: OwnerStore = {
  id: "tenant", name: "Магазин", slug: "shop", business_vertical: "food",
  catalog_published: false, onboarding_completed: true, catalog_status: "not_started",
  next_plan: "basic", preferred_billing_period: "monthly",
};
const readiness: StudioReadiness = { products: 0, stockedProducts: 0, newOrders: 0, pickupEnabled: false, deliveryEnabled: false, pickupAddress: "" };

describe("AI Studio next step", () => {
  it("moves through setup as real store state changes", () => {
    expect(studioNextStep(store, readiness).route).toBe("/catalog-builder");
    const building = { ...store, catalog_status: "building" as const };
    expect(studioNextStep(building, readiness).route).toBe("/product-new");
    const withProduct = { ...readiness, products: 1 };
    expect(studioNextStep(building, withProduct).route).toBe("/stock");
    const withStock = { ...withProduct, stockedProducts: 1 };
    expect(studioNextStep(building, withStock).route).toBe("/delivery");
    const withPickup = { ...withStock, pickupEnabled: true, pickupAddress: "Алматы, Абая 10" };
    expect(studioNextStep(building, withPickup).route).toBe("/catalog");
    const published = { ...building, catalog_published: true };
    expect(studioNextStep(published, { ...withPickup, newOrders: 1 }).route).toBe("/orders");
    expect(studioNextStep(published, { ...withProduct, newOrders: 1 }).route).toBe("/orders");
    expect(studioNextStep(published, withPickup).route).toBe("/analytics");
  });

  it("does not count pickup without an address as ready", () => {
    expect(studioNextStep({ ...store, catalog_status: "ready" }, { ...readiness, products: 1, stockedProducts: 1, pickupEnabled: true }).route).toBe("/delivery");
  });
});
