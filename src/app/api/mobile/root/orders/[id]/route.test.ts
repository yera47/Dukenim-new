import { beforeEach, expect, it, vi } from "vitest";

const authorize = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));
vi.mock("@/lib/mobile-auth", () => ({ getMobileRoot: authorize }));
import { GET } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const request = () => new Request(`https://example.test/api/mobile/root/orders/${id}`);
const context = (value = id) => ({ params: Promise.resolve({ id: value }) });
beforeEach(() => { authorize.mockReset(); authorize.mockResolvedValue(null); });

it("denies unauthenticated and non-root callers", async () => {
  expect((await GET(request(), context())).status).toBe(403);
});

it("rejects malformed order identifiers before database access", async () => {
  const from = vi.fn(); authorize.mockResolvedValue({ admin: { from } });
  expect((await GET(request(), context("bad"))).status).toBe(400);
  expect(from).not.toHaveBeenCalled();
});

it("fails closed when the order read fails", async () => {
  const from = vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: { message: "offline" } })) })) })) }));
  authorize.mockResolvedValue({ admin: { from } });
  expect((await GET(request(), context())).status).toBe(503);
});

it("returns tenant-bound order details without cache", async () => {
  const order = { id, tenant_id: "store", customer_id: null, order_number: 12, total: 1000 };
  const from = vi.fn((table: string) => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({
    maybeSingle: vi.fn(async () => table === "orders" ? { data: order, error: null } : { data: { id: "store", name: "Магазин", slug: "shop" }, error: null }),
    eq: vi.fn(async () => ({ data: table === "order_items" ? [{ title_snapshot: "Товар", price_snapshot: 1000, qty: 1 }] : [], error: null })),
  })) })) }));
  authorize.mockResolvedValue({ admin: { from } });
  const response = await GET(request(), context());
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store, private");
  const body = await response.json();
  expect(body.order).toEqual(order);
  expect(body.store.name).toBe("Магазин");
  expect(body.items).toHaveLength(1);
});
