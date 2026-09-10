import { beforeEach, describe, expect, it, vi } from "vitest";

const connectionSingle = vi.fn();
const connectionSelect = vi.fn(() => ({ single: connectionSingle }));
const connectionUpsert = vi.fn(() => ({ select: connectionSelect }));
const requestUpsert = vi.fn();
const from = vi.fn((table: string) => table === "integration_connections"
  ? { upsert: connectionUpsert }
  : { upsert: requestUpsert });

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ from })) }));
vi.mock("@/lib/integrations/business-ru", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/integrations/business-ru")>();
  return { ...original, probeBusinessRuConnection: vi.fn() };
});
vi.mock("@/lib/integrations/secrets", () => ({ encryptIntegrationSecret: vi.fn(() => "encrypted-record") }));

import { requireRole } from "@/lib/auth";
import { probeBusinessRuConnection } from "@/lib/integrations/business-ru";
import { encryptIntegrationSecret } from "@/lib/integrations/secrets";
import { connectBusinessRu } from "./business-ru-actions";

function connectionForm() {
  const form = new FormData();
  form.set("accountUrl", "https://w833379.business.ru");
  form.set("appId", "123456");
  form.set("secret", "a".repeat(32));
  return form;
}

describe("Business.Ru connection action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.stubEnv("INTEGRATION_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64url"));
    vi.mocked(requireRole).mockResolvedValue({
      tenantId: "tenant-1",
      user: { id: "owner-1", email: "owner@example.com" },
    } as never);
    vi.mocked(probeBusinessRuConnection).mockResolvedValue({ token: "b".repeat(32), checkedModel: "customerorders" });
    connectionSingle.mockResolvedValue({ data: { id: "connection-1" }, error: null });
    requestUpsert.mockResolvedValue({ error: null });
  });

  it("probes before storing an encrypted tenant-scoped connection", async () => {
    await connectBusinessRu(connectionForm());

    expect(probeBusinessRuConnection).toHaveBeenCalledWith({
      accountDomain: "w833379.business.ru",
      appId: "123456",
      secret: "a".repeat(32),
    });
    expect(encryptIntegrationSecret).toHaveBeenCalledWith({
      appId: "123456",
      secret: "a".repeat(32),
      token: "b".repeat(32),
    }, expect.any(String));
    expect(connectionUpsert).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: "tenant-1",
      provider: "biznes_ru",
      token_ciphertext: "encrypted-record",
      status: "active",
    }), { onConflict: "tenant_id,provider" });
    expect(requestUpsert).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: "tenant-1",
      provider: "biznes_ru",
      status: "connected",
      secret_reference: "connection-1",
    }), { onConflict: "tenant_id,provider" });
  });

  it("does not write anything when the provider rejects the preflight", async () => {
    vi.mocked(probeBusinessRuConnection).mockRejectedValue(new Error("provider failure"));
    await expect(connectBusinessRu(connectionForm())).rejects.toThrow("не подтвердил");
    expect(connectionUpsert).not.toHaveBeenCalled();
    expect(requestUpsert).not.toHaveBeenCalled();
  });
});
