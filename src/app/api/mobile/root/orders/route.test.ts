import { beforeEach, expect, it, vi } from "vitest";

const authorize = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));
vi.mock("@/lib/mobile-auth", () => ({ getMobileRoot: authorize }));
import { GET } from "./route";

const request = (query = "") => new Request(`https://example.test/api/mobile/root/orders${query}`);
beforeEach(() => { authorize.mockReset(); authorize.mockResolvedValue(null); });

it("denies callers without a current superadmin session", async () => {
  expect((await GET(request())).status).toBe(403);
});

it("rejects invalid status filters", async () => {
  authorize.mockResolvedValue({ admin: {} });
  expect((await GET(request("?status=unknown"))).status).toBe(400);
});

it("fails closed if order data cannot be read", async () => {
  const from = vi.fn((name: string) => name === "orders"
    ? { select: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: null, error: { message: "offline" }, count: null })) })) })) }
    : { select: vi.fn(async () => ({ data: [], error: null })) });
  authorize.mockResolvedValue({ admin: { from } });
  expect((await GET(request())).status).toBe(503);
});

it("returns matching real orders and does not cache private data", async () => {
  const rows = [{ id: "one", tenant_id: "store", order_number: 27, status: "new", payment_status: "pending", total: 24900, created_at: "2026-09-28T00:00:00Z", delivery_method: "pickup" }];
  const from = vi.fn((name: string) => name === "orders"
    ? { select: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: rows, error: null, count: 1 })) })) })) }
    : { select: vi.fn(async () => ({ data: [{ id: "store", name: "Магазин", slug: "shop" }], error: null })) });
  authorize.mockResolvedValue({ admin: { from } });
  const response = await GET(request("?q=%D0%BC%D0%B0%D0%B3&status=new"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store, private");
  expect(await response.json()).toEqual({ orders: [{ ...rows[0], storeName: "Магазин" }], possiblyMore: false });
});
