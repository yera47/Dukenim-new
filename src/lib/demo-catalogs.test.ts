import { describe, expect, it } from "vitest";
import { demoVerticals, demoId, demoSlug, demoVerticalById, demoVerticalBySlug, demoProductsFor } from "./demo-catalogs";

describe("demo storefronts", () => {
  it("has independent, reversible identities for every business", () => {
    expect(new Set(demoVerticals.map(demoId)).size).toBe(demoVerticals.length);
    for (const vertical of demoVerticals) {
      expect(demoVerticalById(demoId(vertical))).toBe(vertical);
      expect(demoVerticalBySlug(demoSlug(vertical))).toBe(vertical);
      expect(demoProductsFor(vertical).length).toBeGreaterThan(0);
    }
    expect(demoVerticalBySlug("customer-store")).toBeUndefined();
  });
  it("has ten distinct fashion products and photographs", () => {
    const products = demoProductsFor("fashion");
    expect(products.length).toBeGreaterThanOrEqual(10);
    expect(new Set(products.map(p => p.id)).size).toBe(products.length);
    expect(new Set(products.map(p => p.images?.[0])).size).toBe(products.length);
    expect(products.every(p => Number.isInteger(p.price) && p.price > 0)).toBe(true);
  });
  it("does not reuse fashion product identifiers in other demos", () => {
    const fashionIds = new Set(demoProductsFor("fashion").map(p => p.id));
    for (const vertical of demoVerticals.filter(v => v !== "fashion")) {
      expect(demoProductsFor(vertical).some(p => fashionIds.has(p.id))).toBe(false);
    }
  });
  it("covers every demo offering with a distinct illustration", () => {
    for (const vertical of demoVerticals) {
      const items = demoProductsFor(vertical);
      expect(items.every(item => Boolean(item.images?.[0])), vertical).toBe(true);
      expect(new Set(items.map(item => item.images?.[0])).size, vertical).toBe(items.length);
    }
  });
});
