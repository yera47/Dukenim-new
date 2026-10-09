import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ owner: vi.fn() }));
vi.mock("@/lib/mobile-auth", () => ({ getMobileOwner: mocks.owner }));

import { GET, PATCH, POST } from "./route";

const tenantId = "11111111-1111-4111-8111-111111111111";
const campaignId = "22222222-2222-4222-8222-222222222222";
const response = (method: string, body?: unknown) => new Request(`http://localhost/api/mobile/campaigns${method === "GET" ? `?tenantId=${tenantId}` : ""}`, {
  method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
});

function mockOwner(plan: "basic" | "standard" = "standard") {
  const campaignResult = { id: campaignId, title: "Летняя коллекция", eyebrow: null, body: "Новая подборка", cta_label: "Смотреть", status: "draft", image_url: null };
  const tenant = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { plan, next_plan: plan, status: "active", trial_ends_at: null }, error: null }) };
  const campaign = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [campaignResult], error: null }),
    insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: campaignResult, error: null }), maybeSingle: vi.fn().mockResolvedValue({ data: { id: campaignId, status: "published" }, error: null }),
  };
  mocks.owner.mockResolvedValue({ tenantId, admin: { from: vi.fn((table: string) => table === "tenants" ? tenant : campaign) } });
  return { campaign, tenant };
}

describe("mobile campaigns entitlement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not read or expose campaigns to a Base owner", async () => {
    const { campaign } = mockOwner("basic");
    const result = await GET(response("GET"));
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ canManage: false, premiumRequired: true, planName: "Base", campaigns: [] });
    expect(campaign.select).not.toHaveBeenCalled();
  });

  it("creates a Premium campaign only as a draft", async () => {
    const { campaign } = mockOwner("standard");
    const result = await POST(response("POST", { tenantId, title: "Летняя коллекция", ctaLabel: "Смотреть", startsAt: "2026-10-10T00:00:00.000Z", endsAt: "2026-10-20T00:00:00.000Z" }));
    expect(result.status).toBe(201);
    expect(campaign.insert).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: tenantId, title: "Летняя коллекция", starts_at: "2026-10-10T00:00:00.000Z", ends_at: "2026-10-20T00:00:00.000Z", status: "draft" }));
  });

  it("rejects campaign periods that end before they start", async () => {
    mockOwner("standard");
    const result = await POST(response("POST", { tenantId, title: "Праздничная акция", startsAt: "2026-10-20T00:00:00.000Z", endsAt: "2026-10-10T00:00:00.000Z" }));
    expect(result.status).toBe(400);
  });

  it("rejects Base writes and status changes on the server", async () => {
    const { campaign } = mockOwner("basic");
    const create = await POST(response("POST", { tenantId, title: "Скидка", ctaLabel: "Смотреть" }));
    const change = await PATCH(response("PATCH", { tenantId, campaignId, status: "published" }));
    expect(create.status).toBe(403);
    expect(change.status).toBe(403);
    expect(campaign.insert).not.toHaveBeenCalled();
    expect(campaign.update).not.toHaveBeenCalled();
  });

  it("requires an authenticated shop owner", async () => {
    mocks.owner.mockResolvedValue(null);
    expect((await POST(response("POST", { tenantId, title: "Акция" }))).status).toBe(401);
  });
});
