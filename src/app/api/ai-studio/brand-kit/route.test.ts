import { beforeEach, describe, expect, it, vi } from "vitest";

const access = vi.hoisted(() => ({ premium: vi.fn(async () => true) }));
vi.mock("@/lib/auth", () => ({ requireRole: vi.fn(async () => ({ tenantId: "tenant-server", userId: "owner-a" })) }));
vi.mock("@/lib/plan-access", () => ({ tenantHasPlan: access.premium }));
import { GET, POST } from "./route";

const valid = {
  revision: 1,
  palette: { background: "#fff8ef", surface: "#ffffff", accent: "#f59b14", ink: "#2b1a10" },
  vertical: "fashion",
  categories: [{ id: "outerwear", name: "Верхняя одежда" }],
  selectedStyle: "editorial-photo",
  layoutRatios: { hero: "16:9", category: "1:1", story: "9:16" },
};

function post(body: unknown) {
  return POST(new Request("http://local/api/ai-studio/brand-kit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
}

describe("Brand Kit route release gate", () => {
  beforeEach(() => { vi.clearAllMocks(); access.premium.mockResolvedValue(true); });

  it("locks Base before accepting a brand profile", async () => {
    access.premium.mockResolvedValue(false);
    expect((await GET()).status).toBe(403);
    expect((await post(valid)).status).toBe(403);
  });

  it("reports an honest disabled capability", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ enabled: false, provider: null });
  });

  it("derives tenant identity on the server and keeps references unverified", async () => {
    const response = await post(valid);
    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json).toMatchObject({ enabled: false, referencesVerified: false });
    expect(json.plan.profileFingerprint).toEqual(expect.any(String));
  });

  it("rejects tenant and reference injection rather than trusting client provenance", async () => {
    for (const injected of [
      { ...valid, tenantId: "tenant-other" },
      { ...valid, logoReferenceId: "logo:other-tenant" },
      { ...valid, productReferenceIds: ["product:unverified"] },
    ]) {
      expect((await post(injected)).status).toBe(400);
    }
  });

  it("returns a controlled 400 for malformed or incomplete JSON", async () => {
    expect((await post({ palette: null })).status).toBe(400);
    expect((await post({ ...valid, categories: [] })).status).toBe(400);
    expect((await post({ ...valid, palette: { ...valid.palette, accent: "red" } })).status).toBe(400);
  });
});
