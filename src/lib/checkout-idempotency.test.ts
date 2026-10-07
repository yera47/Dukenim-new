import { describe, expect, it, vi } from "vitest";
import { checkoutPayloadFingerprint, clearCheckoutKey, getOrCreateCheckoutKey } from "./checkout-idempotency";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe("checkout idempotency key", () => {
  it("keeps the same key for a lost response and replaces it after payload changes", () => {
    const storage = memoryStorage();
    const createKey = vi.fn()
      .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
      .mockReturnValueOnce("22222222-2222-4222-8222-222222222222")
      .mockReturnValueOnce("33333333-3333-4333-8333-333333333333");
    const first = checkoutPayloadFingerprint({ slug: "shop", items: [{ id: "a", qty: 1 }] });
    const changed = checkoutPayloadFingerprint({ slug: "shop", items: [{ id: "a", qty: 2 }] });

    expect(getOrCreateCheckoutKey(storage, "shop", first, createKey)).toBe("11111111-1111-4111-8111-111111111111");
    expect(getOrCreateCheckoutKey(storage, "shop", first, createKey)).toBe("11111111-1111-4111-8111-111111111111");
    expect(getOrCreateCheckoutKey(storage, "shop", changed, createKey)).toBe("22222222-2222-4222-8222-222222222222");
    clearCheckoutKey(storage, "shop");
    expect(getOrCreateCheckoutKey(storage, "shop", changed, createKey)).toBe("33333333-3333-4333-8333-333333333333");
  });
});
