import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionContext: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ kind: "admin" })) }));
vi.mock("@/lib/integrations/planfix-sync", () => ({ syncOrderToPlanfix: vi.fn() }));

import { getSessionContext } from "@/lib/auth";
import { syncOrderToPlanfix } from "@/lib/integrations/planfix-sync";
import { syncOrderToPlanfixAction } from "./planfix-sync-action";

const orderId = "11111111-1111-4111-8111-111111111111";
function form() { const value = new FormData(); value.set("orderId", orderId); return value; }

describe("Planfix order sync action", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires a tenant owner before reading or sending order data", async () => {
    vi.mocked(getSessionContext).mockResolvedValue(null);
    expect(await syncOrderToPlanfixAction({}, form())).toEqual({ error: "Войдите в аккаунт владельца." });
    expect(syncOrderToPlanfix).not.toHaveBeenCalled();
  });

  it("reports a successful first sync", async () => {
    vi.mocked(getSessionContext).mockResolvedValue({ user: { id: "owner" }, role: "owner", tenantId: "tenant" } as never);
    vi.mocked(syncOrderToPlanfix).mockResolvedValue({ state: "synced", providerObjectId: "42" });
    expect(await syncOrderToPlanfixAction({}, form())).toEqual({ success: "Покупатель и заказ переданы в Planfix." });
  });

  it("does not encourage a blind retry after an uncertain provider outcome", async () => {
    vi.mocked(getSessionContext).mockResolvedValue({ user: { id: "owner" }, role: "owner", tenantId: "tenant" } as never);
    vi.mocked(syncOrderToPlanfix).mockRejectedValue(new Error("Planfix order delivery must be checked manually"));
    expect((await syncOrderToPlanfixAction({}, form())).error).toContain("не создать дубль");
  });
});
