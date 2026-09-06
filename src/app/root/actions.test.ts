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
  it("rejects invalid access settings without touching the database", async () => {
    mocks.requireRole.mockResolvedValue({ user: { id: "actor" }, role: "superadmin" });
    const from = vi.fn();
    mocks.createAdminClient.mockReturnValue({ from });
    const form = new FormData();
    form.set("tenantId", "11111111-1111-4111-8111-111111111111");
    form.set("reason", "Проверка");
    form.set("plan", "unlimited");
    form.set("status", "active");
    await expect(updateStore(form)).rejects.toThrow("Недопустимый");
    expect(from).not.toHaveBeenCalled();
  });
  it("fails closed when the pre-change audit cannot be written", async () => {
    mocks.requireRole.mockResolvedValue({ user: { id: "actor" }, role: "superadmin" });
    const from = vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: { message: "offline" } }) });
    mocks.createAdminClient.mockReturnValue({ from });
    const form = new FormData();
    form.set("tenantId", "11111111-1111-4111-8111-111111111111");
    form.set("reason", "Проверка");
    form.set("plan", "basic");
    form.set("status", "paused");
    await expect(updateStore(form)).rejects.toThrow("Изменения не выполнены");
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("platform_audit_events");
  });
});
