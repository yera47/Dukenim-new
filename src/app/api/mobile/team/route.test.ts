import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({owner:vi.fn(),rpc:vi.fn(),createClient:vi.fn()}));
vi.mock("@/lib/mobile-auth",()=>({getMobileOwner:mocks.owner}));
vi.mock("@supabase/supabase-js",()=>({createClient:mocks.createClient}));
import {POST} from "./route";

const tenantId="11111111-1111-4111-8111-111111111111";
const permissions={orders:"write",catalog:"read",stock:"read",customers:"none",analytics:"read",studio:"none"};
const request=(body:unknown)=>new Request("https://dukenim.kz/api/mobile/team",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${"a".repeat(40)}`},body:JSON.stringify(body)});

describe("mobile staff invitation",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.owner.mockResolvedValue({role:"owner",tenantId,user:{id:"owner"}});mocks.rpc.mockResolvedValue({data:"invite-id",error:null});mocks.createClient.mockReturnValue({rpc:mocks.rpc});});
  it("uses the verified owner tenant and keeps the one-time secret in the fragment",async()=>{
    const response=await POST(request({tenantId,email:" Worker@Example.com ",title:"Менеджер",permissions}));
    const body=await response.json();
    expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.owner).toHaveBeenCalledWith(expect.any(Request),tenantId);
    expect(mocks.rpc).toHaveBeenCalledWith("manage_staff",expect.objectContaining({p_tenant:tenantId,p_action:"invite",p_data:expect.objectContaining({email:"worker@example.com",permissions})}));
    expect(body.url).toMatch(/\/staff\/join#token=[a-f0-9]{64}$/);expect(body.url).not.toContain("?token=");
    expect(mocks.rpc.mock.calls[0][1].p_data.token_hash).toMatch(/^[a-f0-9]{64}$/);expect(body.url).not.toContain(mocks.rpc.mock.calls[0][1].p_data.token_hash);
  });
  it("rejects missing ownership and superadmin substitution before the RPC",async()=>{
    for(const owner of [null,{role:"superadmin",tenantId,user:{id:"root"}}]){mocks.owner.mockResolvedValueOnce(owner);const response=await POST(request({tenantId,email:"worker@example.com",title:"Менеджер",permissions}));expect(response.status).toBe(403);}
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects privilege fields and invalid analytics writes",async()=>{
    for(const unsafe of [{...permissions,billing:"write"},{...permissions,analytics:"write"}]){const response=await POST(request({tenantId,email:"worker@example.com",title:"Менеджер",permissions:unsafe}));expect(response.status).toBe(400);}
    expect(mocks.owner).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
