import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
const from = vi.fn(() => ({ upsert }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ from })) }));

import { requireRole } from "@/lib/auth";
import { saveCrmIntegrationRequest } from "./actions";

function requestForm(provider: string, intent = "submit") {
  const form = new FormData();
  form.set("provider", provider);
  form.set("intent", intent);
  form.set("syncDirection", "orders_and_customers");
  return form;
}

describe("multi-provider integration requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRole).mockResolvedValue({ tenantId: "tenant-1" } as never);
    upsert.mockResolvedValue({ error: null });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  });

  it("rejects a provider outside the reviewed registry", async () => {
    await expect(saveCrmIntegrationRequest(requestForm("invented-crm"))).rejects.toThrow("Выберите систему");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects an invented action or unsafe account URL", async () => {
    await expect(saveCrmIntegrationRequest(requestForm("planfix", "invented"))).rejects.toThrow("корректное действие");
    const form = requestForm("planfix");
    form.set("accountUrl", "javascript:alert(1)");
    await expect(saveCrmIntegrationRequest(form)).rejects.toThrow("корректную ссылку");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("stores each provider under a tenant/provider conflict key", async () => {
    await saveCrmIntegrationRequest(requestForm("keycrm"));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: "tenant-1",
      provider: "keycrm",
      status: "credentials_needed",
    }), { onConflict: "tenant_id,provider" });
  });

  it("keeps a selected provider as an independent later request", async () => {
    await saveCrmIntegrationRequest(requestForm("r_keeper", "later"));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      provider: "r_keeper",
      status: "details_later",
    }), { onConflict: "tenant_id,provider" });
  });
});
