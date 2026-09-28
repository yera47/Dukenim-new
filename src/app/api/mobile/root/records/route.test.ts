import { beforeEach, expect, it, vi } from "vitest";

const authorize = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));
vi.mock("@/lib/mobile-auth", () => ({ getMobileRoot: authorize }));
import { GET } from "./route";

const request = (section: string) => new Request(`https://example.test/api/mobile/root/records?section=${section}`);
beforeEach(() => { authorize.mockReset(); authorize.mockResolvedValue(null); });

it("blocks anyone without the current root role", async () => {
  expect((await GET(request("audit"))).status).toBe(403);
});

it("rejects unknown sections", async () => {
  authorize.mockResolvedValue({ admin: {} });
  expect((await GET(request("other"))).status).toBe(400);
});

it("fails closed when audit data cannot be read", async () => {
  const from = vi.fn((name: string) => name === "platform_audit_events"
    ? { select: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: null, error: { message: "offline" } })) })) })) }
    : { select: vi.fn(async () => ({ data: [], error: null })) });
  authorize.mockResolvedValue({ admin: { from } });
  expect((await GET(request("audit"))).status).toBe(503);
});

it("returns named audit events without cache", async () => {
  const from = vi.fn((name: string) => name === "platform_audit_events"
    ? { select: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [{ id: "event", tenant_id: "store", action: "test", reason: null, created_at: "2026-09-28" }], error: null })) })) })) }
    : { select: vi.fn(async () => ({ data: [{ id: "store", name: "Магазин" }], error: null })) });
  authorize.mockResolvedValue({ admin: { from } });
  const response = await GET(request("audit"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store, private");
  expect((await response.json()).events[0].storeName).toBe("Магазин");
});
