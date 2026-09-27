import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ owner: vi.fn(), entitlement: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/mobile-auth", () => ({ getMobileOwner: mocks.owner }));
vi.mock("@/lib/entitlement", () => ({ computeEntitlement: mocks.entitlement }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { POST } from "./route";

const tenantId = "11111111-1111-4111-8111-111111111111";
const generationId = "22222222-2222-4222-8222-222222222222";
const request = (id = tenantId) => new Request("http://localhost/api/mobile/ai-design/apply", {
  method: "POST", body: JSON.stringify({ tenantId: id, generationId }),
});
const design = { templateKey: "gallery", paletteKey: "mono", heroTitle: "Магазин рядом",
  heroSubtitle: "Подборка товаров на каждый день", heroCtaLabel: "Открыть каталог", rationale: "Крупные карточки" };

function adminFor(output: unknown) {
  const eq = vi.fn().mockReturnThis();
  const update = vi.fn().mockReturnThis();
  const tenant = { select: vi.fn().mockReturnThis(), eq, maybeSingle: vi.fn().mockResolvedValue({ data: { status: "trial", plan: "basic", trial_ends_at: "2099-01-01" }, error: null }) };
  const generation = { select: vi.fn().mockReturnThis(), eq, maybeSingle: vi.fn().mockResolvedValue({ data: output ? { output } : null, error: null }) };
  const settings = { select: vi.fn().mockReturnThis(), eq, update, maybeSingle: vi.fn().mockResolvedValue({ data: { brand_color: "#123456", hero_image_url: "https://example.com/image.jpg", tenant_id: tenantId }, error: null }) };
  const from = vi.fn((table: string) => table === "tenants" ? tenant : table === "ai_studio_generations" ? generation : settings);
  return { admin: { from }, eq, update };
}

describe("mobile AI design apply", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.entitlement.mockReturnValue({ active: true }); });

  it("requires an owner before reading tenant data", async () => {
    mocks.owner.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
  });

  it("rejects a missing generation scoped to the selected tenant", async () => {
    const fixture = adminFor(null);
    mocks.owner.mockResolvedValue({ admin: fixture.admin, tenantId });
    expect((await POST(request())).status).toBe(404);
    expect(fixture.eq).toHaveBeenCalledWith("tenant_id", tenantId);
    expect(fixture.update).not.toHaveBeenCalled();
  });

  it("applies a saved design without replacing existing media", async () => {
    const fixture = adminFor(design);
    mocks.owner.mockResolvedValue({ admin: fixture.admin, tenantId });
    expect((await POST(request())).status).toBe(200);
    expect(fixture.update).toHaveBeenCalledWith(expect.objectContaining({
      template_key: "gallery", hero_title: design.heroTitle,
      hero_image_url: "https://example.com/image.jpg", brand_color: "#123456",
    }));
    expect(mocks.revalidate).toHaveBeenCalled();
  });
});
