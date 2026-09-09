import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({session:vi.fn(),client:vi.fn(),entitlement:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@/lib/auth",()=>({getSessionContext:mocks.session}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.client}));
vi.mock("@/lib/plan-access",()=>({tenantEntitlement:mocks.entitlement}));
import {GET,POST} from "./route";
describe("conversation history access",()=>{
  beforeEach(()=>vi.clearAllMocks());
  it("rejects cross-origin and oversized authenticated image requests",async()=>{
    mocks.session.mockResolvedValue({user:{id:"owner"},role:"owner",tenantId:"mine"});mocks.entitlement.mockResolvedValue({active:true});
    const foreign=await POST(new Request("https://example.test/api",{method:"POST",headers:{origin:"https://other.test"},body:"{}"}));expect(foreign.status).toBe(403);
    const large=await POST(new Request("https://example.test/api",{method:"POST",body:"x".repeat(1000001)}));expect(large.status).toBe(413);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("rejects anonymous requests",async()=>{
    mocks.session.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await POST(new Request("https://example.test",{method:"POST",body:"{}"}))).status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("loads validated history only for the authenticated tenant",async()=>{
    mocks.session.mockResolvedValue({user:{id:"owner"},role:"owner",tenantId:"mine"});
    const chain={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),limit:vi.fn().mockResolvedValue({data:[{id:"1",input_summary:"Одежда",output:{reply:"Какой стиль?",task:null}},{id:"invalid",input_summary:"invalid",output:{html:"bad"}}],error:null})};
    mocks.client.mockResolvedValue({from:vi.fn().mockReturnValue(chain)});
    const response=await GET();
    expect(chain.eq).toHaveBeenCalledWith("tenant_id","mine");
    expect(chain.eq).toHaveBeenCalledWith("intent","consultation");
    expect((await response.json()).turns).toHaveLength(1);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
