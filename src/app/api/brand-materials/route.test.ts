import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({session:vi.fn(),client:vi.fn(),entitlement:vi.fn()}));
vi.mock("@/lib/auth",()=>({getSessionContext:mocks.session}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.client}));
vi.mock("@/lib/plan-access",()=>({tenantEntitlement:mocks.entitlement}));
import {GET,POST} from "./route";
function request(revision="0"){const form=new FormData();form.set("revision",revision);form.set("notes","Светлый магазин");return new Request("https://local.test/api/brand-materials",{method:"POST",body:form});}
describe("brand material access",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.session.mockResolvedValue({user:{id:"owner"},tenantId:"mine",role:"owner"});mocks.entitlement.mockResolvedValue({active:true});});
  it("rejects anonymous read/write",async()=>{mocks.session.mockResolvedValue(null);expect((await GET()).status).toBe(401);expect((await POST(request())).status).toBe(401);expect(mocks.client).not.toHaveBeenCalled();});
  it("rejects expired writes",async()=>{mocks.entitlement.mockResolvedValue({active:false});expect((await POST(request())).status).toBe(403);});
  it("does not overwrite stale revisions",async()=>{
    const chain={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{revision:2},error:null})};
    mocks.client.mockResolvedValue({from:vi.fn().mockReturnValue(chain)});
    expect((await POST(request("1"))).status).toBe(409);expect(chain.eq).toHaveBeenCalledWith("tenant_id","mine");
  });
  it("returns no logo path and prevents caching private notes",async()=>{
    const chain={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{revision:1,notes:"rules",colors:[],logo_path:null},error:null})};
    mocks.client.mockResolvedValue({from:vi.fn().mockReturnValue(chain)});
    const response=await GET();expect(response.headers.get("cache-control")).toBe("private, no-store");expect(await response.json()).toEqual({revision:1,notes:"rules",colors:[],logoUrl:null});
  });
});
