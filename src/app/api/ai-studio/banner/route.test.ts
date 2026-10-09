import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), image: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionContext: vi.fn(async () => ({ user: { id: "owner" }, role: "owner", tenantId: "tenant" })) }));
vi.mock("@/lib/plan-access", () => ({ tenantHasPlan: vi.fn(async () => true) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));
vi.mock("@/lib/ai/studio", () => ({ aiStudioBriefSchema: { safeParse: vi.fn() } }));
vi.mock("@/lib/ai/marketing-image-provider", () => ({ createMarketingImage: mocks.image, getMarketingImageStatus: () => ({ configured: true, provider: "azure" }), MarketingImageError: class extends Error {} }));
import { POST } from "./route";

describe("banner cost gate", () => {
  it("blocks image requests before credit reservation and Azure when owner has not enabled live spend", async () => {
    const prior = process.env.AI_IMAGE_LIVE_ENABLED;
    delete process.env.AI_IMAGE_LIVE_ENABLED;
    try {
      const response = await POST(new Request("http://local/api/ai-studio/banner", { method: "POST", body: JSON.stringify({ brief: "Светлая обложка магазина" }) }));
      expect(response.status).toBe(503);
      expect(mocks.admin).not.toHaveBeenCalled();
      expect(mocks.image).not.toHaveBeenCalled();
    } finally {
      if (prior === undefined) delete process.env.AI_IMAGE_LIVE_ENABLED;
      else process.env.AI_IMAGE_LIVE_ENABLED = prior;
    }
  });
});
