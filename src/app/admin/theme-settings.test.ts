import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(), createClient: vi.fn(), getSettings: vi.fn(), updateSettings: vi.fn(), revalidatePath: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/queries/owner", () => ({
  getStorefrontSettings: mocks.getSettings,
  updateStorefrontSettingsIfCurrent: mocks.updateSettings,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { saveThemeSettings } from "./actions";

const tenantId = "11111111-1111-4111-8111-111111111111";
const version = "2026-10-09T10:00:00.000Z";
const tenant = { plan: "basic", next_plan: "basic", status: "active", trial_ends_at: null, accent_color: "#123456", business_vertical: "food" };

function form(templateKey: string, settingsVersion = version) {
  const value = new FormData();
  value.set("templateKey", templateKey);
  value.set("settingsVersion", settingsVersion);
  value.set("paletteKey", "mono");
  value.set("heroTitle", "Сохранённое оформление");
  return value;
}

describe("website storefront settings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    mocks.requireRole.mockResolvedValue({ tenantId, role: "owner" });
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: tenant, error: null }) };
    mocks.createClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });
    mocks.getSettings.mockResolvedValue({ data: { template_key: "journal", palette_key: "paper-forest", brand_color: "#445566", updated_at: version }, error: null });
    mocks.updateSettings.mockResolvedValue({ data: { tenant_id: tenantId }, error: null });
    mocks.redirect.mockImplementation((path: string) => { throw new Error(`redirect:${path}`); });
  });

  it("keeps the previously saved design while changing only its copy", async () => {
    await saveThemeSettings(form("journal"));
    expect(mocks.updateSettings).toHaveBeenCalledWith(expect.anything(), tenantId, version, expect.objectContaining({ template_key: "journal", hero_title: "Сохранённое оформление", brand_color: "#445566" }));
  });

  it("allows an explicit switch to one of the segment's current choices", async () => {
    await saveThemeSettings(form("gallery"));
    expect(mocks.updateSettings).toHaveBeenCalledWith(expect.anything(), tenantId, version, expect.objectContaining({ template_key: "gallery" }));
  });

  it("does not accept a different template outside this segment", async () => {
    await expect(saveThemeSettings(form("atelier"))).rejects.toThrow("Выберите текущий дизайн");
    expect(mocks.updateSettings).not.toHaveBeenCalled();
  });

  it("rejects a stale page before the write", async () => {
    await expect(saveThemeSettings(form("gallery", "older"))).rejects.toThrow("redirect:/admin/settings?theme=outdated");
    expect(mocks.updateSettings).not.toHaveBeenCalled();
  });

  it("rejects a concurrent edit after the read", async () => {
    mocks.updateSettings.mockResolvedValue({ data: null, error: null });
    await expect(saveThemeSettings(form("gallery"))).rejects.toThrow("redirect:/admin/settings?theme=outdated");
  });
});
