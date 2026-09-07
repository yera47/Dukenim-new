import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(), entitlement: vi.fn(), client: vi.fn(), getSettings: vi.fn(), saveSettings: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getSessionContext: mocks.context }));
vi.mock("@/lib/plan-access", () => ({ tenantEntitlement: mocks.entitlement }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/queries/owner", () => ({ getStorefrontSettings: mocks.getSettings, saveStorefrontSettings: mocks.saveSettings }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { POST } from "./route";

const tenantId = "11111111-1111-4111-8111-111111111111";
const generationId = "22222222-2222-4222-8222-222222222222";
const draft = { eyebrow: "Новая коллекция", title: "Вещи на каждый день", body: "Понятный выбор без лишнего шума.", ctaLabel: "Смотреть каталог" };
const request = () => new Request("http://localhost/api/ai-studio/copy/apply", { method: "POST", body: JSON.stringify({ generationId }) });

function generationClient(intent: "hero" | "promotion", output: unknown = draft) {
  const eq = vi.fn().mockReturnThis();
  const chain = { select: vi.fn().mockReturnThis(), eq, in: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: generationId, intent, output }, error: null }) };
  return { client: { from: vi.fn().mockReturnValue(chain) }, eq };
}

describe("apply AI copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.mockResolvedValue({ user: { id: "owner" }, role: "owner", tenantId });
    mocks.entitlement.mockResolvedValue({ active: true, plan: "basic" });
    mocks.getSettings.mockResolvedValue({ data: { template_key: "market", palette_key: "paper-forest", brand_color: "#123456", hero_image_url: "https://example.com/hero.jpg" }, error: null });
    mocks.saveSettings.mockResolvedValue({ error: null });
  });

  it("rejects unauthenticated requests before database access", async () => {
    mocks.context.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it("applies only a tenant-owned hero result and preserves visual settings", async () => {
    const mock = generationClient("hero"); mocks.client.mockResolvedValue(mock.client);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mock.eq).toHaveBeenCalledWith("tenant_id", tenantId);
    expect(mocks.saveSettings).toHaveBeenCalledWith(mock.client, tenantId, {
      template_key: "market", palette_key: "paper-forest", brand_color: "#123456",
      hero_title: draft.title, hero_subtitle: draft.body, hero_image_url: "https://example.com/hero.jpg", hero_cta_label: draft.ctaLabel,
    });
  });

  it("rejects malformed persisted model output", async () => {
    const mock = generationClient("hero", { title: "x" }); mocks.client.mockResolvedValue(mock.client);
    expect((await POST(request())).status).toBe(422);
    expect(mocks.saveSettings).not.toHaveBeenCalled();
  });

  it("does not create a campaign on the Start plan", async () => {
    const mock = generationClient("promotion"); mocks.client.mockResolvedValue(mock.client);
    expect((await POST(request())).status).toBe(403);
    expect(mocks.saveSettings).not.toHaveBeenCalled();
  });

  it("stores a Brand promotion as an unpublished campaign", async () => {
    mocks.entitlement.mockResolvedValue({ active: true, plan: "standard" });
    const generation = generationClient("promotion");
    const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "campaign-1" }, error: null }) }) });
    const campaigns = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), insert };
    const client = { from: vi.fn((table: string) => table === "ai_studio_generations" ? generation.client.from(table) : campaigns) };
    mocks.client.mockResolvedValue(client);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: tenantId, title: draft.title, ai_generation_id: generationId, status: "draft" }));
  });
});
