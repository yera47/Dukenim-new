import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireRole: mocks.auth }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { saveDeliveryZone } from "./actions";
const id = "11111111-1111-4111-8111-111111111111";
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
