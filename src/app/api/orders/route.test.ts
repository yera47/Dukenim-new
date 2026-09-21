import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/buyer-identity",()=>({buyerIdentity:vi.fn(),setBuyerCookie:vi.fn()}));
vi.mock("@/lib/phone-auth-ready",()=>({phoneAuthReady:vi.fn(()=>false)}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/queries/orders", () => ({ createStorefrontOrder: vi.fn(), getCheckoutOptions: vi.fn() }));
vi.mock("@/lib/queries/tenants", () => ({ getPublicTenantBySlug: vi.fn() }));
vi.mock("next/headers",()=>({cookies:vi.fn().mockResolvedValue({get:vi.fn(),set:vi.fn()})}));
import { POST } from "./route";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicTenantBySlug } from "@/lib/queries/tenants";
import { getCheckoutOptions, createStorefrontOrder } from "@/lib/queries/orders";
import {buyerIdentity} from "@/lib/buyer-identity";
import {phoneAuthReady} from "@/lib/phone-auth-ready";

const valid = { slug: "serik-shop", name: "Серик", phone: "+77000000000", deliveryMethod: "pickup", paymentMethod: "cash", items: [{ variantId: "12345678-1234-4123-8123-123456789012", qty: 1 }] };
function request(body: unknown) { return new Request("https://example.test/api/orders", { method: "POST", body: JSON.stringify(body) }); }

describe("order API fails safely before database writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
    vi.mocked(buyerIdentity).mockResolvedValue({userId:"buyer-user",hash:"a".repeat(64),token:"b".repeat(64)});
    vi.mocked(phoneAuthReady).mockReturnValue(false);
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
    { ...valid, timingMode: "scheduled", requestedFor: new Date(Date.now() - 60_000).toISOString() },
  ])("rejects invalid checkout input", async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(createAdminClient).not.toHaveBeenCalled();
  });
  it("passes a validated requested time to the atomic order RPC", async()=>{
    const admin={auth:{admin:{getUserById:vi.fn().mockResolvedValue({data:{user:{phone:"+77000000000",phone_confirmed_at:"2026-09-20T00:00:00Z"}}})}}};
    vi.mocked(createAdminClient).mockReturnValue(admin as unknown as ReturnType<typeof createAdminClient>);
    vi.mocked(getPublicTenantBySlug).mockResolvedValue({data:{id:"mine"},error:null} as Awaited<ReturnType<typeof getPublicTenantBySlug>>);
    vi.mocked(getCheckoutOptions).mockResolvedValue({settings:{pickup_enabled:true,delivery_enabled:false,pickup_location:null,payment_online:false,min_order:0},zones:[],error:null});
    vi.mocked(createStorefrontOrder).mockResolvedValue({data:[{order_id:"order",order_number:7,total:1500}],error:null} as Awaited<ReturnType<typeof createStorefrontOrder>>);
    const requestedFor=new Date(Date.now()+60*60_000).toISOString();
    const response=await POST(request({...valid,timingMode:"scheduled",requestedFor}));
    expect(response.status).toBe(200);
    expect(createStorefrontOrder).toHaveBeenCalledWith(admin,expect.objectContaining({tenantId:"mine",requestedFor,phone:"+77000000000",buyer:expect.objectContaining({userId:"buyer-user"})}));
  });
  it("requires a verified phone account before creating the order",async()=>{
    vi.mocked(phoneAuthReady).mockReturnValue(true);
    vi.mocked(getPublicTenantBySlug).mockResolvedValue({data:{id:"mine"},error:null} as Awaited<ReturnType<typeof getPublicTenantBySlug>>);
    vi.mocked(getCheckoutOptions).mockResolvedValue({settings:{pickup_enabled:true,delivery_enabled:false,pickup_location:null,payment_online:false,min_order:0},zones:[],error:null});
    vi.mocked(createAdminClient).mockReturnValue({auth:{admin:{getUserById:vi.fn().mockResolvedValue({data:{user:{phone:null,phone_confirmed_at:null}}})}}} as unknown as ReturnType<typeof createAdminClient>);
    expect((await POST(request(valid))).status).toBe(401);expect(createStorefrontOrder).not.toHaveBeenCalled();
  });
  it("creates a guest order with phone and consent when SMS is unavailable",async()=>{
    vi.mocked(buyerIdentity).mockResolvedValue({userId:null,hash:"a".repeat(64),token:"b".repeat(64)});
    const admin={auth:{admin:{getUserById:vi.fn()}}};
    vi.mocked(createAdminClient).mockReturnValue(admin as unknown as ReturnType<typeof createAdminClient>);
    vi.mocked(getPublicTenantBySlug).mockResolvedValue({data:{id:"mine"},error:null} as Awaited<ReturnType<typeof getPublicTenantBySlug>>);
    vi.mocked(getCheckoutOptions).mockResolvedValue({settings:{pickup_enabled:true,delivery_enabled:false,pickup_location:null,payment_online:false,min_order:0},zones:[],error:null});
    vi.mocked(createStorefrontOrder).mockResolvedValue({data:[{order_id:"order",order_number:8,total:1500}],error:null} as Awaited<ReturnType<typeof createStorefrontOrder>>);
    expect((await POST(request(valid))).status).toBe(400);
    expect(createStorefrontOrder).not.toHaveBeenCalled();
    expect((await POST(request({...valid,privacyConsent:true}))).status).toBe(200);
    expect(admin.auth.admin.getUserById).not.toHaveBeenCalled();
    expect(createStorefrontOrder).toHaveBeenCalledWith(admin,expect.objectContaining({phone:valid.phone,buyer:expect.objectContaining({userId:null,hash:"a".repeat(64)})}));
  });
  it("links a confirmed email account while keeping its contact phone unverified",async()=>{
    const admin={auth:{admin:{getUserById:vi.fn().mockResolvedValue({data:{user:{email:"buyer@example.test",email_confirmed_at:"2026-09-21T00:00:00Z",phone:null}}})}}};
    vi.mocked(createAdminClient).mockReturnValue(admin as unknown as ReturnType<typeof createAdminClient>);
    vi.mocked(getPublicTenantBySlug).mockResolvedValue({data:{id:"mine"},error:null} as Awaited<ReturnType<typeof getPublicTenantBySlug>>);
    vi.mocked(getCheckoutOptions).mockResolvedValue({settings:{pickup_enabled:true,delivery_enabled:false,pickup_location:null,payment_online:false,min_order:0},zones:[],error:null});
    vi.mocked(createStorefrontOrder).mockResolvedValue({data:[{order_id:"order",order_number:9,total:1500}],error:null} as Awaited<ReturnType<typeof createStorefrontOrder>>);
    expect((await POST(request({...valid,privacyConsent:true}))).status).toBe(200);
    expect(createStorefrontOrder).toHaveBeenCalledWith(admin,expect.objectContaining({phone:valid.phone,buyer:expect.objectContaining({userId:"buyer-user"})}));
  });
  it("requires the Yandex delivery notice before any order write",async()=>{
    vi.mocked(getPublicTenantBySlug).mockResolvedValue({data:{id:"mine"},error:null} as Awaited<ReturnType<typeof getPublicTenantBySlug>>);
    vi.mocked(getCheckoutOptions).mockResolvedValue({settings:{pickup_enabled:false,delivery_enabled:true,pickup_location:null,payment_online:false,min_order:0},zones:[{id:"12345678-1234-4123-8123-123456789013",name:"Центр",cost:1800,free_from:null,eta_text:null,provider:"yandex"}],error:null});
    vi.mocked(createAdminClient).mockReturnValue({} as ReturnType<typeof createAdminClient>);
    const response=await POST(request({...valid,deliveryMethod:"courier",deliveryAddress:"Кызылорда, улица, дом 1",zoneId:"12345678-1234-4123-8123-123456789013"}));
    expect(response.status).toBe(400);
    expect(createStorefrontOrder).not.toHaveBeenCalled();
  });
});
