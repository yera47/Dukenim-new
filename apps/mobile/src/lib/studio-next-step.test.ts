import { describe, expect, it } from "vitest";
import { loadStudioReadiness, resolveStudioReadiness, studioNextStep, type StudioReadiness } from "./studio-next-step";
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

  it("loads a complete readiness snapshot", async () => {
    await expect(loadStudioReadiness(async () => [
      { count: 3 }, { count: 2 }, { count: 1 },
      { data: { pickup_enabled: true, delivery_enabled: false, pickup_location: { address: "Almaty" } } },
    ])).resolves.toEqual({ products: 3, stockedProducts: 2, newOrders: 1, pickupEnabled: true, deliveryEnabled: false, pickupAddress: "Almaty" });
  });

  it("fails on a partial metric response and can be retried", async () => {
    expect(() => resolveStudioReadiness([{ count: 1 }, { count: null }, { count: 0 }, { data: null }])).toThrow("readiness");
    let attempt = 0;
    const loader = async () => ++attempt === 1
      ? Promise.reject(new Error("offline"))
      : [{ count: 1 }, { count: 1 }, { count: 0 }, { data: { delivery_enabled: true } }];
    await expect(loadStudioReadiness(loader)).rejects.toThrow("offline");
    await expect(loadStudioReadiness(loader)).resolves.toMatchObject({ products: 1, stockedProducts: 1, deliveryEnabled: true });
  });
});
