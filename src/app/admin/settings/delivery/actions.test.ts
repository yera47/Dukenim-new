import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireRole: mocks.auth }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { saveDeliveryZone, saveDeliverySettings, savePickupSettings } from "./actions";
const id = "11111111-1111-4111-8111-111111111111";
describe("pickup settings", () => {
  beforeEach(() => vi.clearAllMocks());
  function pickup() { const f = new FormData(); for(const [key,value] of Object.entries({enabled:"on",address:"Город, улица, дом",hours:"10–19",preparation:"Через 2 часа",confirmed:"on",tenant_id:"victim",payment_online:"true"})) f.set(key,value); return f; }
  it("requires confirmed location", async () => {
    const f=pickup(); f.delete("confirmed");
    expect((await savePickupSettings({},f)).error).toBeTruthy();
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("rejects tenantless root", async () => {
    mocks.auth.mockResolvedValue({user:{id:"root"},tenantId:null});
    expect((await savePickupSettings({},pickup())).error).toBeTruthy();
  });
  it("does not change payments or another tenant and requires affected row", async () => {
    mocks.auth.mockResolvedValue({user:{id:"owner"},tenantId:"mine"});
    const chain={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),update:vi.fn().mockReturnThis(),single:vi.fn().mockResolvedValue({data:{plan:"basic",status:"active"},error:null}),maybeSingle:vi.fn().mockResolvedValue({data:null,error:null})};
    mocks.client.mockResolvedValue({from:vi.fn().mockReturnValue(chain)});
    expect((await savePickupSettings({},pickup())).error).toBeTruthy();
    expect(chain.eq).toHaveBeenCalledWith("tenant_id","mine");
    expect(Object.keys(chain.update.mock.calls[0][0])).toEqual(["pickup_enabled","pickup_location"]);
    chain.maybeSingle.mockResolvedValue({data:{tenant_id:"mine"},error:null} as never);
    expect((await savePickupSettings({},pickup())).success).toBeTruthy();
  });
});
function form() { const f = new FormData(); f.set("id",id); f.set("name","Центр"); f.set("cost","1000"); f.set("tenantId","other"); return f; }
describe("delivery zone authorisation", () => {
  beforeEach(() => vi.clearAllMocks());
  it("rejects demo sessions before DB access", async () => {
    mocks.auth.mockResolvedValue({ user: null, tenantId: "demo" });
    expect((await saveDeliveryZone({},form())).error).toBeTruthy();
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("scopes updates to session tenant and verifies affected row", async () => {
    mocks.auth.mockResolvedValue({ user: {id:"owner"}, tenantId:"mine" });
    const chain = { select:vi.fn().mockReturnThis(), eq:vi.fn().mockReturnThis(), update:vi.fn().mockReturnThis(),
      single:vi.fn().mockResolvedValue({data:{plan:"basic",status:"active"},error:null}),
      maybeSingle:vi.fn().mockResolvedValueOnce({data:{id},error:null}).mockResolvedValueOnce({data:null,error:null}) };
    mocks.client.mockResolvedValue({from:vi.fn().mockReturnValue(chain)});
    expect((await saveDeliveryZone({},form())).error).toBeTruthy();
    expect(chain.eq).toHaveBeenCalledWith("tenant_id","mine");
    expect(chain.update).toHaveBeenCalledWith({name:"Центр",cost:1000,free_from:null,eta_text:null,is_active:false});
  });
});

describe("delivery settings", () => {
  beforeEach(() => vi.clearAllMocks());
  function settings(minimum = "0", enabled = false) {
    const f = new FormData(); f.set("minOrder", minimum); f.set("tenantId", "victim");
    f.set("merchant_key", "must-not-be-written");
    if (enabled) f.set("deliveryEnabled", "on");
    return f;
  }
  it.each(["", "-1", "1.5", "NaN", "2000000001"])("rejects invalid minimum %s", async minimum => {
    expect((await saveDeliverySettings({}, settings(minimum))).error).toBeTruthy();
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("rejects tenantless owner", async () => {
    mocks.auth.mockResolvedValue({user:{id:"owner"},tenantId:null});
    expect((await saveDeliverySettings({}, settings())).error).toBeTruthy();
    expect(mocks.client).not.toHaveBeenCalled();
  });
  function database(zones: unknown[] = [{id}], affected: unknown = {tenant_id:"mine"}) {
    mocks.auth.mockResolvedValue({user:{id:"owner"},tenantId:"mine"});
    const chain = {select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),update:vi.fn().mockReturnThis(),
      single:vi.fn().mockResolvedValue({data:{plan:"basic",status:"active"},error:null}),
      maybeSingle:vi.fn().mockResolvedValue({data:affected,error:null}),
      limit:vi.fn().mockResolvedValue({data:zones,error:null})};
    mocks.client.mockResolvedValue({from:vi.fn().mockReturnValue(chain)});
    return chain;
  }
  it("requires an active zone before enabling delivery", async () => {
    const db = database([]);
    expect((await saveDeliverySettings({},settings("0",true))).error).toBeTruthy();
    expect(db.update).not.toHaveBeenCalled();
  });
  it("updates only allowlisted fields within session tenant", async () => {
    const db = database();
    expect((await saveDeliverySettings({},settings("2500",true))).success).toBeTruthy();
    expect(db.update).toHaveBeenCalledWith({delivery_enabled:true,min_order:2500});
    expect(db.eq).toHaveBeenCalledWith("tenant_id","mine");
    expect(db.eq).not.toHaveBeenCalledWith("tenant_id","victim");
  });
  it("does not report success when RLS affects no row", async () => {
    database([],null);
    expect((await saveDeliverySettings({},settings())).error).toBeTruthy();
  });
});
