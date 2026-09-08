import { describe, expect, it, vi } from "vitest";
import { submitCheckout } from "./checkout-submit";

describe("checkout confirmation", () => {
  it("accepts only a valid saved order response", async () => {
    const send = vi.fn().mockResolvedValue(Response.json({ orderNumber: 42, total: 1500 }));
    await expect(submitCheckout({ slug: "shop" }, send)).resolves.toEqual({ orderNumber: 42, total: 1500 });
    expect(send).toHaveBeenCalledOnce();
  });
  it("does not retry ambiguous network failures", async () => {
    const send = vi.fn().mockRejectedValue(new TypeError("network"));
    await expect(submitCheckout({}, send)).rejects.toThrow("Заказ мог быть принят");
    expect(send).toHaveBeenCalledOnce();
  });
  it.each([{}, { orderNumber: 1, total: -1 }, { orderNumber: "1", total: 0 }, { orderNumber: 1, total: 0.5 }])("rejects malformed confirmation %j", async body => {
    await expect(submitCheckout({}, vi.fn().mockResolvedValue(Response.json(body)))).rejects.toThrow("неполное подтверждение");
  });
  it("handles a non-JSON error page", async () => {
    await expect(submitCheckout({}, vi.fn().mockResolvedValue(new Response("Bad gateway", { status: 502 })))).rejects.toThrow("Корзина сохранена");
  });
  it("preserves actionable server validation errors", async () => {
    await expect(submitCheckout({}, vi.fn().mockResolvedValue(Response.json({ error: "Товар закончился" }, { status: 400 })))).rejects.toThrow("Товар закончился");
  });
});
