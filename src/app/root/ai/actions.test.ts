import{beforeEach,describe,expect,it,vi}from"vitest";
const mocks=vi.hoisted(()=>({requireRole:vi.fn(),createClient:vi.fn(),createAdminClient:vi.fn(),audit:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/lib/auth",()=>({requireRole:mocks.requireRole}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:mocks.createAdminClient}));
vi.mock("@/lib/queries/root",()=>({createPlatformAuditEvent:mocks.audit}));
import{configureCreditControls,grantCompensationCredits}from"./actions";

const tenantId="11111111-1111-4111-8111-111111111111",requestId="22222222-2222-4222-8222-222222222222";
describe("superadmin credit controls",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.requireRole.mockResolvedValue({user:{id:"root-user"},role:"superadmin"});mocks.createAdminClient.mockReturnValue({kind:"audit"});mocks.audit.mockResolvedValue({error:null});});
  it("does not construct privileged clients when superadmin authorization fails",async()=>{
    mocks.requireRole.mockRejectedValue(new Error("redirect"));
    await expect(grantCompensationCredits(new FormData())).rejects.toThrow("redirect");
    expect(mocks.requireRole).toHaveBeenCalledWith(["superadmin"]);expect(mocks.createAdminClient).not.toHaveBeenCalled();expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("grants an idempotent compensating balance only with a reason and audit",async()=>{
    const rpc=vi.fn().mockResolvedValue({data:45,error:null});mocks.createClient.mockResolvedValue({rpc});
    const form=new FormData();form.set("tenantId",tenantId);form.set("requestId",requestId);form.set("credits","15");form.set("reason","Provider incident compensation");
    await grantCompensationCredits(form);
    expect(mocks.audit).toHaveBeenNthCalledWith(1,{kind:"audit"},expect.objectContaining({actorId:"root-user",tenantId,action:"ai_credit.compensation_requested",reason:"Provider incident compensation"}));
    expect(rpc).toHaveBeenCalledWith("admin_grant_ai_product_credits",{p_tenant_id:tenantId,p_credits:15,p_reason:"Provider incident compensation",p_event_key:`compensation:${requestId}`});
    expect(mocks.audit).toHaveBeenNthCalledWith(2,{kind:"audit"},expect.objectContaining({action:"ai_credit.compensation_applied"}));
  });
  it("fails closed before an RPC when the audit request cannot be written",async()=>{
    const rpc=vi.fn();mocks.createClient.mockResolvedValue({rpc});mocks.audit.mockResolvedValue({error:{message:"offline"}});
    const form=new FormData();form.set("tenantId",tenantId);form.set("requestId",requestId);form.set("credits","5");form.set("reason","Manual correction reason");
    await expect(grantCompensationCredits(form)).rejects.toThrow("No credits were granted");expect(rpc).not.toHaveBeenCalled();
  });
  it("updates tenant and owner caps plus kill switch through the guarded RPC",async()=>{
    const rpc=vi.fn().mockResolvedValue({data:null,error:null});mocks.createClient.mockResolvedValue({rpc});
    const form=new FormData();form.set("tenantId",tenantId);form.set("generationEnabled","true");form.set("killSwitch","false");form.set("tenantCreditCap","500");form.set("tenantUsdMicrosCap","1000000");form.set("ownerUsdMicrosCap","5000000");form.set("reason","Approved local control fixture");
    await configureCreditControls(form);
    expect(rpc).toHaveBeenCalledWith("admin_configure_ai_credit_controls",{p_tenant_id:tenantId,p_generation_enabled:true,p_tenant_credit_cap:500,p_tenant_usd_micros_cap:1_000_000,p_kill_switch:false,p_owner_usd_micros_cap:5_000_000});
    expect(mocks.audit).toHaveBeenCalledTimes(2);
  });
});
