import { beforeEach, expect, it, vi } from "vitest";

const authorize = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));
vi.mock("@/lib/mobile-auth", () => ({ getMobileRoot: authorize }));
import { POST } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id }) };
const request = (body: unknown) => new Request(`https://example.test/api/mobile/root/stores/${id}/publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const valid = { slug: "sample-store", expected: false, publish: true, reason: "Каталог готов" };

beforeEach(() => { authorize.mockReset(); authorize.mockResolvedValue(null); });

it("denies a caller without the superadmin role", async () => {
  expect((await POST(request(valid), context)).status).toBe(403);
});

it("rejects a missing slug or unchanged state before the privileged RPC", async () => {
  const rpc = vi.fn();
  authorize.mockResolvedValue({ admin: { rpc }, user: { id: "actor" } });
  expect((await POST(request({ ...valid, slug: "" }), context)).status).toBe(400);
  expect((await POST(request({ ...valid, publish: false }), context)).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});

it("passes exact expected state, slug, actor and reason to the audited RPC", async () => {
  const rpc = vi.fn(async () => ({ data: true, error: null }));
  authorize.mockResolvedValue({ admin: { rpc }, user: { id: "actor" } });
  const response = await POST(request(valid), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ published: true });
  expect(rpc).toHaveBeenCalledWith("root_set_catalog_publication", { p_tenant: id, p_actor: "actor", p_slug: valid.slug, p_expected: false, p_publish: true, p_reason: valid.reason });
});

it("does not claim publication when the guard rejects it", async () => {
  authorize.mockResolvedValue({ admin: { rpc: vi.fn(async () => ({ data: false, error: null })) }, user: { id: "actor" } });
  expect((await POST(request(valid), context)).status).toBe(409);
});
