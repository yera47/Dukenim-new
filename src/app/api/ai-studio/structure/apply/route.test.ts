import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ context: vi.fn(), entitlement: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionContext: mocks.context }));
vi.mock("@/lib/plan-access", () => ({ tenantEntitlement: mocks.entitlement }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { POST } from "./route";
const tenantId = "11111111-1111-4111-8111-111111111111";
const generationId = "22222222-2222-4222-8222-222222222222";
const request = () => new Request("http://localhost/api/ai-studio/structure/apply", { method: "POST", body: JSON.stringify({ generationId }) });
describe("apply AI structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.mockResolvedValue({ user: { id: "owner" }, role: "owner", tenantId });
    mocks.entitlement.mockResolvedValue({ active: true });
  });
  it("rejects unauthenticated requests before database access", async () => {
    mocks.context.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("rejects expired subscriptions before database access", async () => {
    mocks.entitlement.mockResolvedValue({ active: false });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("cannot apply another tenant's generation", async () => {
    const eq = vi.fn().mockReturnThis();
    const chain = { select: vi.fn().mockReturnThis(), eq, single: vi.fn().mockResolvedValue({ data: { catalog_status: "building" } }), maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
    const from = vi.fn().mockReturnValue(chain);
    mocks.client.mockResolvedValue({ from });
    expect((await POST(request())).status).toBe(404);
    expect(eq).toHaveBeenCalledWith("tenant_id", tenantId);
    expect(from).not.toHaveBeenCalledWith("categories");
  });
  it("uses persisted output and ignores duplicate stable keys on retries", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { catalog_status: "building" } }), maybeSingle: vi.fn().mockResolvedValue({ data: { id: generationId, output: { sections: [{ name: "Одежда" }, { name: "Обувь" }] } } }) };
    mocks.client.mockResolvedValue({ from: (table: string) => table === "categories" ? { upsert } : chain });
    expect((await POST(request())).status).toBe(200);
    expect(upsert).toHaveBeenCalledWith([
      { tenant_id: tenantId, name: "Одежда", slug: `ai-${generationId}-1`, sort_order: 0, is_active: true },
      { tenant_id: tenantId, name: "Обувь", slug: `ai-${generationId}-2`, sort_order: 1, is_active: true },
    ], { onConflict: "tenant_id,slug", ignoreDuplicates: true });
  });
});
