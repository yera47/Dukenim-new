import { expect, it } from "vitest";
import { mapStorefrontProduct } from "./storefront";
import type { ProductRow } from "@/types/database";
const product: ProductRow = { id: "product", tenant_id: "tenant", title: "Товар", description: null, price: 9000, old_price: null, category_id: "category", images: [], is_featured: false, is_active: true, sort_order: 0, created_at: "2026-09-09T00:00:00Z" };
it("keeps actual categories instead of flattening every item into Каталог", () => {
  expect(mapStorefrontProduct(product, [], new Map([["category", "Уход за лицом"]])).category).toBe("Уход за лицом");
});
it("does not invent a name for an unavailable or inactive category", () => {
  expect(mapStorefrontProduct(product, [], new Map()).category).toBe("Каталог");
});
