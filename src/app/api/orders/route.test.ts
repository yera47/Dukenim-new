import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/queries/orders", () => ({ createStorefrontOrder: vi.fn(), getCheckoutOptions: vi.fn() }));
vi.mock("@/lib/queries/tenants", () => ({ getPublicTenantBySlug: vi.fn() }));
import { POST } from "./route";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicTenantBySlug } from "@/lib/queries/tenants";
import { getCheckoutOptions, createStorefrontOrder } from "@/lib/queries/orders";

const valid = { slug: "serik-shop", name: "Серик", phone: "+77000000000", deliveryMethod: "pickup", paymentMethod: "cash", items: [{ variantId: "12345678-1234-4123-8123-123456789012", qty: 1 }] };
function request(body: unknown) { return new Request("https://example.test/api/orders", { method: "POST", body: JSON.stringify(body) }); }

describe("order API fails safely before database writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
  });
  afterEach(() => vi.unstubAllEnvs());
  it("does not accept pickup when settings are missing", async () => {
    vi.mocked(getPublicTenantBySlug).mockResolvedValue({data:{id:"mine"},error:null} as Awaited<ReturnType<typeof getPublicTenantBySlug>>);
    vi.mocked(getCheckoutOptions).mockResolvedValue({settings:null,zones:[],error:null});
    expect((await POST(request(valid))).status).toBe(503);
    expect(createStorefrontOrder).not.toHaveBeenCalled();
  });
  it.each(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])("never invents an order when %s is missing", async key => {
    vi.stubEnv(key, "");
    const response = await POST(request(valid));
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty("orderId");
    expect(createAdminClient).not.toHaveBeenCalled();
  });
  it.each([
    { ...valid, items: [{ variantId: "v1", qty: 1 }] },
    { ...valid, items: [valid.items[0], valid.items[0]] },
    { ...valid, items: [{ ...valid.items[0], qty: -1 }] },
    { ...valid, paymentMethod: "online" },
    { ...valid, deliveryMethod: "courier", deliveryAddress: "" },
  ])("rejects invalid checkout input", async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
