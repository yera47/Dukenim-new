import { afterEach, beforeEach, expect, it, vi } from "vitest";

const authorize = vi.hoisted(() => vi.fn());
vi.mock("@/lib/mobile-auth", () => ({ getMobileOwner: authorize }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { POST } from "./route";

const tenantId = "11111111-1111-4111-8111-111111111111";
const request = (body: unknown, token = "x".repeat(24)) => new Request("https://example.test/api/mobile/stores/archive", {
  method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body),
});
const body = { action: "archive", tenantId, slug: "demo-shop", reason: "Owner requested archive" };

beforeEach(() => {
  authorize.mockReset();
  vi.stubEnv("ENABLE_STORE_ARCHIVE", "true");
});
afterEach(() => vi.unstubAllEnvs());

it("fails closed without touching auth or draft schema when the feature is disabled", async () => {
  vi.stubEnv("ENABLE_STORE_ARCHIVE", "false");
  const response = await POST(request(body));
  expect(response.status).toBe(404);
  expect(authorize).not.toHaveBeenCalled();
});

it("requires a bearer session and exact bounded input", async () => {
  expect((await POST(request(body, "short"))).status).toBe(401);
  expect((await POST(request({ ...body, reason: "x" }))).status).toBe(400);
  expect(authorize).not.toHaveBeenCalled();
});

it("archives only an owned store with the exact slug", async () => {
  const rpc = vi.fn(async () => ({ data: true, error: null }));
  authorize.mockResolvedValue({ user: { id: "owner-id" }, admin: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { slug: "demo-shop", archived_at: null }, error: null }) }) }) }), rpc } });
  const response = await POST(request(body));
  expect(response.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("archive_owner_store", { p_tenant: tenantId, p_actor: "owner-id", p_slug: "demo-shop", p_reason: "Owner requested archive" });
});

it("rejects an archive/restore state conflict before RPC", async () => {
  const rpc = vi.fn();
  authorize.mockResolvedValue({ user: { id: "owner-id" }, admin: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { slug: "demo-shop", archived_at: "2026-10-06T00:00:00Z" }, error: null }) }) }) }), rpc } });
  expect((await POST(request(body))).status).toBe(409);
  expect(rpc).not.toHaveBeenCalled();
});

it("fails gracefully when the archive migration is not applied", async () => {
  const rpc = vi.fn();
  authorize.mockResolvedValue({ user: { id: "owner-id" }, admin: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { code: "42703", message: "column tenants.archived_at does not exist" } }) }) }) }), rpc } });
  const response = await POST(request(body));
  expect(response.status).toBe(503);
  expect((await response.json()).error).toContain("не подготовлен");
  expect(rpc).not.toHaveBeenCalled();
});
