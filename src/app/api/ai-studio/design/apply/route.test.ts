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
const design = {
  templateKey: "market", paletteKey: "paper-forest", heroTitle: "Выберите нужное быстрее",
  heroSubtitle: "Понятный каталог для повседневных покупок.", heroCtaLabel: "Смотреть каталог",
  rationale: "Быстрый каталог выводит ассортимент на первый экран.",
};
const request = () => new Request("http://localhost/api/ai-studio/design/apply", { method: "POST", body: JSON.stringify({ generationId }) });

function clientWith(output: unknown) {
  const eq = vi.fn().mockReturnThis();
  const chain = { select: vi.fn().mockReturnThis(), eq, maybeSingle: vi.fn().mockResolvedValue(output ? { data: { id: generationId, output }, error: null } : { data: null, error: null }) };
  return { client: { from: vi.fn().mockReturnValue(chain) }, eq };
}

describe("apply AI storefront design", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.mockResolvedValue({ user: { id: "owner" }, role: "owner", tenantId });
    mocks.entitlement.mockResolvedValue({ active: true, plan: "basic" });
    mocks.getSettings.mockResolvedValue({ data: { brand_color: "#123456", hero_image_url: "https://example.com/hero.jpg" }, error: null });
    mocks.saveSettings.mockResolvedValue({ error: null });
  });

  it("rejects unauthenticated requests before database access", async () => {
    mocks.context.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it("cannot apply another tenant's generation", async () => {
    const mock = clientWith(null); mocks.client.mockResolvedValue(mock.client);
    expect((await POST(request())).status).toBe(404);
    expect(mock.eq).toHaveBeenCalledWith("tenant_id", tenantId);
    expect(mock.eq).toHaveBeenCalledWith("intent", "store_design");
    expect(mocks.saveSettings).not.toHaveBeenCalled();
  });

  it("preserves owner media and color while applying the approved suggestion", async () => {
    const mock = clientWith(design); mocks.client.mockResolvedValue(mock.client);
    expect((await POST(request())).status).toBe(200);
    expect(mocks.saveSettings).toHaveBeenCalledWith(mock.client, tenantId, {
      template_key: "market", palette_key: "paper-forest", brand_color: "#123456",
      hero_title: design.heroTitle, hero_subtitle: design.heroSubtitle,
      hero_image_url: "https://example.com/hero.jpg", hero_cta_label: design.heroCtaLabel,
    });
  });

  it("rejects a paid template when the current plan is Start", async () => {
    const mock = clientWith({ ...design, templateKey: "gallery" }); mocks.client.mockResolvedValue(mock.client);
    expect((await POST(request())).status).toBe(403);
    expect(mocks.saveSettings).not.toHaveBeenCalled();
  });
});
