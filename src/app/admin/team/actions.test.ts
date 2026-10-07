import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({session:vi.fn(),rpc:vi.fn(),revalidate:vi.fn()}));
vi.mock("@/lib/auth",()=>({getSessionContext:mocks.session}));
vi.mock("@/lib/staff-server",()=>({createStaffClient:async()=>({rpc:mocks.rpc})}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidate}));
import {manageTeam} from "./actions";

const tenantId="11111111-1111-4111-8111-111111111111";
const memberId="22222222-2222-4222-8222-222222222222";
const levels={orders:"write",catalog:"read",stock:"read",customers:"none",analytics:"read",studio:"none"};
function form(action:"invite"|"update"|"remove"|"revoke_invite") {const value=new FormData();value.set("action",action);value.set("tenantId","forged-tenant");value.set("id",memberId);value.set("revision","3");value.set("email","Worker@Example.com");value.set("title","Менеджер");for(const [key,level] of Object.entries(levels))value.set(key,level);return value;}

describe("owner team actions",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.session.mockResolvedValue({user:{id:"owner"},role:"owner",tenantId});mocks.rpc.mockResolvedValue({data:memberId,error:null});});
  it("creates an email-bound fragment invitation in the session tenant",async()=>{
    const result=await manageTeam({},form("invite"));
    expect(result.invitation).toMatch(/^\/staff\/join#token=[a-f0-9]{64}$/);
    expect(mocks.rpc).toHaveBeenCalledWith("manage_staff",expect.objectContaining({p_tenant:tenantId,p_action:"invite",p_data:expect.objectContaining({email:"worker@example.com",permissions:levels})}));
    expect(mocks.rpc.mock.calls[0][1].p_data.token_hash).toMatch(/^[a-f0-9]{64}$/);expect(result.invitation).not.toContain(mocks.rpc.mock.calls[0][1].p_data.token_hash);
  });
  it("applies revision-checked role changes and never forwards owner-only fields",async()=>{
    const value=form("update");value.set("active","on");value.set("notify_orders","on");value.set("billing","write");
    await manageTeam({},value);
    const payload=mocks.rpc.mock.calls[0][1];expect(payload.p_tenant).toBe(tenantId);expect(payload.p_data).toMatchObject({id:memberId,revision:3,active:true,notify_orders:true,permissions:levels});expect(payload.p_data.permissions).not.toHaveProperty("billing");
  });
  it.each(["revoke_invite","remove"] as const)("scopes %s to the owner tenant",async action=>{await manageTeam({},form(action));expect(mocks.rpc).toHaveBeenCalledWith("manage_staff",{p_tenant:tenantId,p_action:action,p_data:{id:memberId}});});
  it("rejects non-owners and invalid privilege escalation before database access",async()=>{
    mocks.session.mockResolvedValueOnce({user:{id:"staff"},role:"staff",tenantId});expect(await manageTeam({},form("update"))).toHaveProperty("error");
    const unsafe=form("update");unsafe.set("analytics","write");expect(await manageTeam({},unsafe)).toHaveProperty("error");expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
