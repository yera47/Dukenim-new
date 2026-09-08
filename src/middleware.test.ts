import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), membership: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock("@/lib/queries/auth", () => ({ getProfileRole: mocks.profile, getUserTenant: mocks.membership }));
vi.mock("@/lib/queries/owner", () => ({ getTenant: vi.fn() }));
import { middleware } from "./middleware";
describe("private route middleware", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test");
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: "owner" } });
    mocks.membership.mockResolvedValue({ data: null });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
  it.each(["/root", "/admin", "/admin/ai-studio", "/onboarding", "/store-preview"])("protects %s when invoked", async path => {
    const response = await middleware(new NextRequest(`https://dukenim.kz${path}`));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://dukenim.kz/login");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("closes missing configuration on every host, including non-Vercel", async () => {
    vi.stubEnv("VERCEL", ""); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const response = await middleware(new NextRequest("https://dukenim.kz/root"));
    expect(response.status).toBe(503);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it("does not authorize owner as platform admin", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
    const response = await middleware(new NextRequest("https://dukenim.kz/root"));
    expect(response.headers.get("location")).toBe("https://dukenim.kz/admin");
  });
  it("never caches authenticated root responses", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "admin" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: "superadmin" } });
    const response = await middleware(new NextRequest("https://dukenim.kz/root"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
