import { beforeEach, expect, it, vi } from "vitest";

const authorize = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));
vi.mock("@/lib/mobile-auth", () => ({ getMobileRoot: authorize }));
import { POST } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id }) };
const body = { number: 12, expectedStatus: "new", reason: "Отмена по запросу магазина" };
const request = (input: unknown) => new Request(`https://example.test/api/mobile/root/orders/${id}/cancel`, { method: "POST", body: JSON.stringify(input) });
beforeEach(() => { authorize.mockReset(); authorize.mockResolvedValue(null); });

it("denies anyone without current superadmin authorization", async () => {
  expect((await POST(request(body), context)).status).toBe(403);
});

it("rejects completed orders and malformed confirmations before mutation", async () => {
  const rpc = vi.fn(); authorize.mockResolvedValue({ admin: { rpc }, user: { id } });
  expect((await POST(request({ ...body, expectedStatus: "done" }), context)).status).toBe(400);
  expect((await POST(request({ ...body, number: 0 }), context)).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});

it("uses the existing guarded inventory-aware RPC with exact actor and number", async () => {
  const rpc = vi.fn(async () => ({ data: true, error: null })); authorize.mockResolvedValue({ admin: { rpc }, user: { id } });
  const response = await POST(request(body), context);
  expect(response.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("root_cancel_unpaid_order", { p_order: id, p_actor: id, p_number: 12, p_expected_status: "new", p_reason: body.reason });
});

it("does not claim success for stale or paid orders rejected by the RPC", async () => {
  const rpc = vi.fn(async () => ({ data: null, error: { message: "paid" } })); authorize.mockResolvedValue({ admin: { rpc }, user: { id } });
  expect((await POST(request(body), context)).status).toBe(409);
});
