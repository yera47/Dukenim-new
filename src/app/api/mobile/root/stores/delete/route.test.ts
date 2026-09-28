import { beforeEach, expect, it, vi } from "vitest";

const authorize = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));
vi.mock("@/lib/mobile-auth", () => ({ getMobileRoot: authorize }));
import { POST } from "./route";

const stores = [
  { id: "11111111-1111-4111-8111-111111111111", slug: "test-one" },
  { id: "22222222-2222-4222-8222-222222222222", slug: "test-two" },
];
const request = (body: unknown) => new Request("https://example.test/api/mobile/root/stores/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { authorize.mockReset(); authorize.mockResolvedValue(null); });

it("denies a caller without the current superadmin role", async () => {
  const response = await POST(request({ stores, reason: "cleanup", confirmation: "УДАЛИТЬ 2" }));
  expect(response.status).toBe(403);
});

it("rejects repeated stores and missing explicit confirmation before RPC", async () => {
  const rpc = vi.fn();
  authorize.mockResolvedValue({ admin: { rpc }, user: { id: "root" } });
  expect((await POST(request({ stores: [stores[0], stores[0]], reason: "cleanup", confirmation: "УДАЛИТЬ 2" }))).status).toBe(400);
  expect((await POST(request({ stores, reason: "cleanup", confirmation: "yes" }))).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});

it("passes exact IDs, slugs and actor to the atomic guarded RPC", async () => {
  const rpc = vi.fn(async () => ({ data: 2, error: null }));
  authorize.mockResolvedValue({ admin: { rpc }, user: { id: "root" } });
  const response = await POST(request({ stores, reason: "  cleanup  ", confirmation: "УДАЛИТЬ 2" }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ deleted: 2 });
  expect(rpc).toHaveBeenCalledWith("root_bulk_delete_empty_stores", { p_stores: stores, p_actor: "root", p_reason: "cleanup" });
});

it("does not report a partial database result as success", async () => {
  authorize.mockResolvedValue({ admin: { rpc: vi.fn(async () => ({ data: 1, error: null })) }, user: { id: "root" } });
  expect((await POST(request({ stores, reason: "cleanup", confirmation: "УДАЛИТЬ 2" }))).status).toBe(409);
});
