import { beforeEach, expect, it, vi } from "vitest";

const authorize = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));
vi.mock("@/lib/mobile-auth", () => ({ getMobileRoot: authorize }));
import { GET, POST } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const request = (body: unknown) => new Request("https://example.test/api/mobile/root/accounts/staff-access", { method: "POST", body: JSON.stringify(body) });
const valid = { accessId: id, email: "staff@example.test", active: false, revision: 2, reason: "Отзыв по запросу владельца" };
beforeEach(() => { authorize.mockReset(); authorize.mockResolvedValue(null); });

it("rejects non-root callers before parsing or mutation", async () => {
  expect((await POST(request(valid))).status).toBe(403);
  expect((await GET(new Request(`https://example.test/api/mobile/root/accounts/staff-access?id=${id}`))).status).toBe(403);
});

it("reads the exact staff access and employee email through the root session", async () => {
  const from = vi.fn((table: string) => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => table === "staff_access" ? { data: { id, user_id: id, tenant_id: id, title: "Менеджер", active: true, revision: 1 }, error: null } : { data: { name: "Магазин" }, error: null }) })) })) }));
  authorize.mockResolvedValue({ admin: { from, auth: { admin: { getUserById: vi.fn(async () => ({ data: { user: { email: valid.email } }, error: null })) } } }, user: { id } });
  const response = await GET(new Request(`https://example.test/api/mobile/root/accounts/staff-access?id=${id}`));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store, private");
  expect((await response.json()).access.storeName).toBe("Магазин");
});

it("rejects malformed confirmations", async () => {
  const rpc = vi.fn(); authorize.mockResolvedValue({ admin: { rpc }, user: { id } });
  expect((await POST(request({ ...valid, revision: -1 }))).status).toBe(400);
  expect((await POST(request({ ...valid, reason: "x" }))).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});

it("passes exact actor, email and revision to the guarded audited RPC", async () => {
  const rpc = vi.fn(async () => ({ data: true, error: null })); authorize.mockResolvedValue({ admin: { rpc }, user: { id } });
  const response = await POST(request(valid));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store, private");
  expect(rpc).toHaveBeenCalledWith("root_set_staff_access", { p_access: id, p_actor: id, p_email: valid.email, p_active: false, p_expected_revision: 2, p_reason: valid.reason });
});

it("does not claim success when the guarded RPC rejects a stale change", async () => {
  const rpc = vi.fn(async () => ({ data: null, error: { message: "stale" } })); authorize.mockResolvedValue({ admin: { rpc }, user: { id } });
  expect((await POST(request(valid))).status).toBe(409);
});
