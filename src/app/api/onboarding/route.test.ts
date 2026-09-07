import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { POST } from "./route";
import { requireRole } from "@/lib/auth";
import { launchVerticals, isLaunchVertical } from "@/lib/launch-verticals";

describe("launch onboarding scope", () => {
  it.each(["services", "event", "unknown", null])("rejects unsupported vertical %s before writes", async businessVertical => {
    const response = await POST(new Request("https://example.test/api/onboarding", { method: "POST", body: JSON.stringify({ plan: "basic", businessVertical, storefrontFormat: "catalog", billingPeriod: "monthly" }) }));
    expect(response.status).toBe(400);
    expect(requireRole).not.toHaveBeenCalled();
  });
  it("shares supported choices and keeps other limited to goods", () => {
    expect(launchVerticals.every(item => isLaunchVertical(item.id))).toBe(true);
    expect(launchVerticals.find(item => item.id === "other")?.label).toBe("Другие товары");
    expect(launchVerticals.find(item => item.id === "food")?.label).toBe("Готовая еда и напитки");
  });
});
