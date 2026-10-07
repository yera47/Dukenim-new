import { describe, expect, it, vi } from "vitest";
import { submitCheckout } from "./checkout-submit";

describe("checkout confirmation", () => {
  const key = "11111111-1111-4111-8111-111111111111";

  it("accepts only a valid saved order response", async () => {
    const send = vi.fn().mockResolvedValue(Response.json({ orderNumber: 42, total: 1500 }));
    await expect(submitCheckout({ slug: "shop" }, key, send)).resolves.toEqual({ orderNumber: 42, total: 1500 });
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith("/api/orders", expect.objectContaining({
      headers: expect.objectContaining({ "Idempotency-Key": key }),
    }));
  });

  it("does not retry ambiguous network failures", async () => {
    const send = vi.fn().mockRejectedValue(new TypeError("network"));
    await expect(submitCheckout({}, key, send)).rejects.toThrow();
    expect(send).toHaveBeenCalledOnce();
  });

  it.each([{}, { orderNumber: 1, total: -1 }, { orderNumber: "1", total: 0 }, { orderNumber: 1, total: 0.5 }])("rejects malformed confirmation %j", async body => {
    await expect(submitCheckout({}, key, vi.fn().mockResolvedValue(Response.json(body)))).rejects.toThrow();
  });

  it("handles a non-JSON error page", async () => {
    await expect(submitCheckout({}, key, vi.fn().mockResolvedValue(new Response("Bad gateway", { status: 502 })))).rejects.toThrow();
  });

  it("preserves actionable server validation errors", async () => {
    const message = "Остаток изменился";
    await expect(submitCheckout({}, key, vi.fn().mockResolvedValue(Response.json({ error: message }, { status: 400 })))).rejects.toThrow(message);
  });
});
