import { beforeEach, expect, it, vi } from "vitest";

const authorize = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));
vi.mock("@/lib/mobile-auth", () => ({ getMobileRoot: authorize }));
import { GET } from "./route";

const request = (q = "") => new Request(`https://example.test/api/mobile/root/accounts?q=${encodeURIComponent(q)}`);
beforeEach(() => { authorize.mockReset(); authorize.mockResolvedValue(null); });

it("denies anyone without the current superadmin role", async () => {
  expect((await GET(request())).status).toBe(403);
});

it("fails closed if any account source cannot be read", async () => {
  const from = vi.fn(() => ({ select: vi.fn(async () => ({ data: [], error: null })) }));
  authorize.mockResolvedValue({ admin: { auth: { admin: { listUsers: vi.fn(async () => ({ data: null, error: { message: "offline" } })) } }, from } });
  expect((await GET(request())).status).toBe(503);
});

it("returns only matching accounts with database role and no-store headers", async () => {
  const users = [
    { id: "one", email: "owner@example.test", banned_until: null, last_sign_in_at: null },
    { id: "two", email: "other@example.test", banned_until: null, last_sign_in_at: null },
  ];
  const tables: Record<string, unknown[]> = {
    profiles: [{ user_id: "one", role: "superadmin" }],
    tenant_users: [{ user_id: "one", tenant_id: "store", role: "owner" }],
    staff_access: [], tenants: [{ id: "store", name: "Shop" }],
  };
  const from = vi.fn((name: string) => ({ select: vi.fn(async () => ({ data: tables[name], error: null })) }));
  authorize.mockResolvedValue({ admin: { auth: { admin: { listUsers: vi.fn(async () => ({ data: { users }, error: null })) } }, from } });
  const response = await GET(request("owner@"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store, private");
  expect(await response.json()).toEqual({ accounts: [{ id: "one", email: "owner@example.test", role: "superadmin", blocked: false, lastSignIn: null, stores: [{ name: "Shop", role: "owner", active: true }] }], possiblyMore: false });
});
