import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), createAdminClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
import { createStore, updateStore, completeRequest, createPromotion, togglePromotion, updateCrmIntegrationStatus } from "./actions";

describe("root mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ user: null, role: "superadmin", tenantId: null });
  });
  it.each([createStore, updateStore, completeRequest, createPromotion, togglePromotion, updateCrmIntegrationStatus])("rejects a local demo session before constructing a privileged client", async action => {
    await expect(action(new FormData())).rejects.toThrow("требуется вход");
    expect(mocks.requireRole).toHaveBeenCalledWith(["superadmin"]);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });
});
