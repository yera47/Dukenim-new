import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), createAdminClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
import { createStore, updateStore, completeRequest, createPromotion, togglePromotion, updateCrmIntegrationStatus, updateRootProduct, setRootStaffAccess } from "./actions";

describe("root mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ user: null, role: "superadmin", tenantId: null });
  });
  it.each([createStore, updateStore, completeRequest, createPromotion, togglePromotion, updateCrmIntegrationStatus, updateRootProduct, setRootStaffAccess])("rejects a local demo session before constructing a privileged client", async action => {
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
  it("rejects a non-integer product price before reading product data", async () => {
    mocks.requireRole.mockResolvedValue({ user: { id: "actor" }, role: "superadmin" });
    const from = vi.fn();
    mocks.createAdminClient.mockReturnValue({ from });
    const form = new FormData();
    form.set("tenantId", "11111111-1111-4111-8111-111111111111");
    form.set("productId", "22222222-2222-4222-8222-222222222222");
    form.set("title", "Товар");
    form.set("description", "Описание");
    form.set("price", "1250.5");
    form.set("reason", "Исправление карточки");
    await expect(updateRootProduct(form)).rejects.toThrow("целым количеством тенге");
    expect(from).not.toHaveBeenCalled();
  });
  it("cannot mark a CRM connected without an active technical connection", async () => {
    mocks.requireRole.mockResolvedValue({ user: { id: "actor" }, role: "superadmin" });
    const from = vi.fn((table: string) => {
      if (table === "crm_integration_requests") return { select: () => ({ eq: () => ({ single: async () => ({ data: { tenant_id: "22222222-2222-4222-8222-222222222222", provider: "biznes_ru", status: "preflight" }, error: null }) }) }) };
      if (table === "integration_connections") return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    mocks.createAdminClient.mockReturnValue({ from });
    const form = new FormData();
    form.set("integrationId", "11111111-1111-4111-8111-111111111111");
    form.set("status", "connected");
    await expect(updateCrmIntegrationStatus(form)).rejects.toThrow("без активного соединения");
    expect(from).not.toHaveBeenCalledWith("platform_audit_events");
  });
});
