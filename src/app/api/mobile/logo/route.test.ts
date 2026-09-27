import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ owner: vi.fn(), prepare: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/mobile-auth", () => ({ getMobileOwner: mocks.owner }));
vi.mock("@/lib/brand-image", () => ({ prepareBrandLogo: mocks.prepare }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { POST } from "./route";

const tenantId = "11111111-1111-4111-8111-111111111111";
function request() {
  const form = new FormData();
  form.append("tenantId", tenantId);
  form.append("logo", new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), "logo.png");
  return new Request("http://localhost/api/mobile/logo", { method: "POST", headers: { Authorization: `Bearer ${"x".repeat(30)}` }, body: form });
}

describe("mobile logo upload", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.prepare.mockResolvedValue({ png: Buffer.from([1, 2, 3]), colors: [] }); });

  it("does not prepare or upload an image for a non-owner", async () => {
    mocks.owner.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.prepare).not.toHaveBeenCalled();
  });

  it("saves a normalized public logo only for the authenticated tenant", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const eq = vi.fn().mockReturnThis();
    const update = vi.fn().mockReturnThis();
    const admin = {
      storage: { from: vi.fn().mockReturnValue({ upload, getPublicUrl: () => ({ data: { publicUrl: "https://example.com/logo.png" } }) }) },
      from: vi.fn().mockReturnValue({ update, eq, select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: tenantId }, error: null }) }),
    };
    mocks.owner.mockResolvedValue({ admin, tenantId });
    expect((await POST(request())).status).toBe(200);
    expect(eq).toHaveBeenCalledWith("id", tenantId);
    expect(update).toHaveBeenCalledWith({ logo_url: "https://example.com/logo.png" });
    expect(upload.mock.calls[0][0]).toMatch(new RegExp(`^${tenantId}/logo-`));
    expect(mocks.revalidate).toHaveBeenCalled();
  });
});
