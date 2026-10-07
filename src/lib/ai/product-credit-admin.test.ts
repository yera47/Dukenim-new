import{describe,expect,it,vi}from"vitest";
import{loadCreditPlatformControl,loadTenantCreditBalance,normalizeCreditBalance}from"./product-credit-admin";

const tenantId="11111111-1111-4111-8111-111111111111";
const row={tenant_id:tenantId,allowance_balance:30,purchased_balance:20,reserved_allowance:4,reserved_purchased:3,generation_enabled:true,tenant_credit_cap:100,tenant_usd_micros_cap:1_000_000,spent_usd_micros:200_000,reserved_usd_micros:100_000,premium_trial_job_started_at:null,premium_trial_job_consumed_at:null};
function tenantClient(result:unknown){const maybeSingle=vi.fn().mockResolvedValue(result);return{client:{from:vi.fn(()=>({select:vi.fn(()=>({eq:vi.fn(()=>({maybeSingle}))}))}))},maybeSingle};}
function platformClient(result:unknown){const maybeSingle=vi.fn().mockResolvedValue(result);return{from:vi.fn(()=>({select:vi.fn(()=>({eq:vi.fn(()=>({maybeSingle}))}))}))};}

describe("unified product-credit admin read model",()=>{
  it("exposes allowance and purchased balances separately and subtracts reservations",()=>{
    expect(normalizeCreditBalance(row)).toMatchObject({availability:"ready",allowanceBalance:30,purchasedBalance:20,availableAllowance:26,availablePurchased:17,availableTotal:43});
  });
  it("returns the same normalized tenant fixture for root and merchant consumers",async()=>{
    const root=tenantClient({data:row,error:null}),merchant=tenantClient({data:row,error:null});
    expect(await loadTenantCreditBalance(root.client,tenantId)).toEqual(await loadTenantCreditBalance(merchant.client,tenantId));
  });
  it("fails closed when the draft migration or account is unavailable",async()=>{
    const missing=tenantClient({data:null,error:{code:"PGRST205",message:"table ai_product_credit_accounts not found"}});
    const absent=tenantClient({data:null,error:null});
    expect(await loadTenantCreditBalance(missing.client,tenantId)).toMatchObject({availability:"migration_unavailable",generationEnabled:false,availableTotal:0});
    expect(await loadTenantCreditBalance(absent.client,tenantId)).toMatchObject({availability:"account_missing",generationEnabled:false,availableTotal:0});
  });
  it("keeps the platform kill switch on whenever controls cannot be read",async()=>{
    await expect(loadCreditPlatformControl(platformClient({data:null,error:{code:"42P01",message:"relation does not exist"}}))).resolves.toMatchObject({availability:"migration_unavailable",killSwitch:true});
    await expect(loadCreditPlatformControl(platformClient({data:null,error:null}))).resolves.toMatchObject({availability:"read_error",killSwitch:true});
  });
});
