import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ owner: vi.fn(), entitlement: vi.fn(), generate: vi.fn(), status: vi.fn() }));
vi.mock("@/lib/mobile-auth", () => ({ getMobileOwner: mocks.owner }));
vi.mock("@/lib/entitlement", () => ({ computeEntitlement: mocks.entitlement }));
vi.mock("@/lib/ai/studio", () => ({ createAiStudioDraft: mocks.generate, getAiStudioStatus: mocks.status }));

import { POST } from "./route";

const tenantId = "11111111-1111-4111-8111-111111111111";
const request = (id = tenantId) => new Request("http://localhost/api/mobile/ai-promotion", {
  method: "POST", body: JSON.stringify({ tenantId: id, brief: "Пятничная акция на настоящую выпечку" }),
});

describe("mobile AI promotion", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.status.mockReturnValue({ configured: true, deployment: "test" }); mocks.entitlement.mockImplementation((tenant: { plan?: string }) => ({ active: true, plan: tenant.plan ?? "standard" })); });

  it("requires an owner before reading or generating", async () => {
    mocks.owner.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("generates a reviewable draft only for the selected tenant", async () => {
    const draft = { eyebrow: "ПЯТНИЦА", title: "Выпечка к выходным", body: "Уточните реальные условия перед публикацией.", ctaLabel: "Смотреть" };
    mocks.generate.mockResolvedValue({ draft, usage: {} });
    const tenant = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { name: "Пекарня", business_vertical: "food", plan: "standard", status: "active" }, error: null }) };
    const usage = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockResolvedValue({ count: 0, error: null }) };
    const saved = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "22222222-2222-4222-8222-222222222222" }, error: null }) };
    const from = vi.fn((table: string) => table === "tenants" ? tenant : table === "ai_studio_generations" ? { ...usage, ...saved } : usage);
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mocks.owner.mockResolvedValue({ admin: { from, rpc }, tenantId, user: { id: "33333333-3333-4333-8333-333333333333" } });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).draft).toEqual(draft);
    expect(tenant.eq).toHaveBeenCalledWith("id", tenantId);
    expect(usage.eq).toHaveBeenCalledWith("tenant_id", tenantId);
    expect(saved.insert).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: tenantId, intent: "promotion", output: draft }));
    expect(rpc).toHaveBeenCalledWith("reserve_ai_credits", expect.objectContaining({ p_tenant_id: tenantId, p_cost: 1 }));
  });

  it("requires Premium before reserving AI credits", async () => {
    mocks.entitlement.mockReturnValue({ active: true, plan: "basic" });
    const tenant = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { name: "Пекарня", business_vertical: "food", plan: "basic", status: "active" }, error: null }) };
    const usage = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockResolvedValue({ count: 0, error: null }) };
    const from = vi.fn((table: string) => table === "tenants" ? tenant : usage);
    const rpc = vi.fn();
    mocks.owner.mockResolvedValue({ admin: { from, rpc }, tenantId, user: { id: "33333333-3333-4333-8333-333333333333" } });
    const result = await POST(request());
    expect(result.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
