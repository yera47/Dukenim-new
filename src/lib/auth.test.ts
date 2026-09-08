import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), tenant: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock("@/lib/queries/auth", () => ({ getProfileRole: mocks.profile, getUserTenant: mocks.tenant }));
import { getSessionContext, requireRole } from "./auth";
describe("server authorization fails closed", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test");
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user", user_metadata: { role: "superadmin" } } }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: "owner" }, error: null });
    mocks.tenant.mockResolvedValue({ data: { tenant_id: "own-shop" }, error: null });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
  it("never grants demo superadmin when config is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    await expect(requireRole(["superadmin"])).rejects.toThrow("redirect:/login");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it("rejects anonymous access", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireRole(["owner"])).rejects.toThrow("redirect:/login");
  });
  it("rejects an auth error even with user data", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } }, error: new Error("invalid") });
    expect(await getSessionContext()).toBeNull();
  });
  it("ignores self-editable metadata role", async () => {
    await expect(requireRole(["superadmin"])).rejects.toThrow("redirect:/admin");
  });
  it("rejects unknown database roles", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "administrator" }, error: null });
    expect(await getSessionContext()).toBeNull();
  });
  it("does not send a customer into a redirect loop", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "customer" }, error: null });
    await expect(requireRole(["owner"])).rejects.toThrow("redirect:/login");
  });
  it("keeps owner tenant isolation", async () => {
    expect(await requireRole(["owner"])).toMatchObject({ role: "owner", tenantId: "own-shop" });
    expect(mocks.tenant).toHaveBeenCalledWith(expect.anything(), "user");
  });
  it("allows verified tenantless admin without inventing a shop", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "superadmin" }, error: null });
    mocks.tenant.mockResolvedValue({ data: null, error: null });
    expect(await requireRole(["superadmin"])).toMatchObject({ role: "superadmin", tenantId: null });
  });
});
