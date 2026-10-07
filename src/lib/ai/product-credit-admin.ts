export type CreditLedgerAvailability="ready"|"migration_unavailable"|"account_missing"|"read_error";

export type CreditLedgerBalance={
  availability:CreditLedgerAvailability;
  tenantId:string;
  allowanceBalance:number;
  purchasedBalance:number;
  reservedAllowance:number;
  reservedPurchased:number;
  availableAllowance:number;
  availablePurchased:number;
  availableTotal:number;
  generationEnabled:boolean;
  tenantCreditCap:number;
  tenantUsdMicrosCap:number;
  spentUsdMicros:number;
  reservedUsdMicros:number;
  premiumTrialJobStartedAt:string|null;
  premiumTrialJobConsumedAt:string|null;
  message:string;
};

export type CreditPlatformControl={
  availability:"ready"|"migration_unavailable"|"read_error";
  killSwitch:boolean;
  ownerUsdMicrosCap:number;
  spentUsdMicros:number;
  reservedUsdMicros:number;
  message:string;
};

type QueryError={code?:string|null;message?:string|null};
type CreditRow={
  tenant_id:string;allowance_balance:number;purchased_balance:number;reserved_allowance:number;reserved_purchased:number;
  generation_enabled:boolean;tenant_credit_cap:number;tenant_usd_micros_cap:number;spent_usd_micros:number;reserved_usd_micros:number;
  premium_trial_job_started_at:string|null;premium_trial_job_consumed_at:string|null;
};
type PlatformRow={kill_switch:boolean;owner_usd_micros_cap:number;spent_usd_micros:number;reserved_usd_micros:number};

const accountColumns="tenant_id,allowance_balance,purchased_balance,reserved_allowance,reserved_purchased,generation_enabled,tenant_credit_cap,tenant_usd_micros_cap,spent_usd_micros,reserved_usd_micros,premium_trial_job_started_at,premium_trial_job_consumed_at";
const platformColumns="kill_switch,owner_usd_micros_cap,spent_usd_micros,reserved_usd_micros";

function missingMigration(error:QueryError|null|undefined){
  return error?.code==="42P01"||error?.code==="PGRST205"||/ai_product_credit_(accounts|platform_control).*not found|relation .* does not exist/i.test(error?.message??"");
}
function finiteNonNegative(value:unknown){return typeof value==="number"&&Number.isFinite(value)&&value>=0?Math.trunc(value):0;}

export function unavailableCreditBalance(tenantId:string,availability:Exclude<CreditLedgerAvailability,"ready">):CreditLedgerBalance{
  const message=availability==="migration_unavailable"?"Credit ledger migration is not applied.":availability==="account_missing"?"Credit account has not been provisioned.":"Credit ledger could not be read.";
  return{availability,tenantId,allowanceBalance:0,purchasedBalance:0,reservedAllowance:0,reservedPurchased:0,availableAllowance:0,availablePurchased:0,availableTotal:0,generationEnabled:false,tenantCreditCap:0,tenantUsdMicrosCap:0,spentUsdMicros:0,reservedUsdMicros:0,premiumTrialJobStartedAt:null,premiumTrialJobConsumedAt:null,message};
}

export function normalizeCreditBalance(row:CreditRow):CreditLedgerBalance{
  const allowanceBalance=finiteNonNegative(row.allowance_balance),purchasedBalance=finiteNonNegative(row.purchased_balance);
  const reservedAllowance=finiteNonNegative(row.reserved_allowance),reservedPurchased=finiteNonNegative(row.reserved_purchased);
  const availableAllowance=Math.max(0,allowanceBalance-reservedAllowance),availablePurchased=Math.max(0,purchasedBalance-reservedPurchased);
  return{availability:"ready",tenantId:row.tenant_id,allowanceBalance,purchasedBalance,reservedAllowance,reservedPurchased,availableAllowance,availablePurchased,availableTotal:availableAllowance+availablePurchased,generationEnabled:Boolean(row.generation_enabled),tenantCreditCap:finiteNonNegative(row.tenant_credit_cap),tenantUsdMicrosCap:finiteNonNegative(row.tenant_usd_micros_cap),spentUsdMicros:finiteNonNegative(row.spent_usd_micros),reservedUsdMicros:finiteNonNegative(row.reserved_usd_micros),premiumTrialJobStartedAt:row.premium_trial_job_started_at??null,premiumTrialJobConsumedAt:row.premium_trial_job_consumed_at??null,message:"Credit ledger is available."};
}

export async function loadTenantCreditBalance(client:unknown,tenantId:string):Promise<CreditLedgerBalance>{
  try{
    const db=client as{from:(table:string)=>{select:(columns:string)=>{eq:(column:string,value:string)=>{maybeSingle:()=>Promise<{data:CreditRow|null;error:QueryError|null}>}}}};
    const result=await db.from("ai_product_credit_accounts").select(accountColumns).eq("tenant_id",tenantId).maybeSingle();
    if(result.error)return unavailableCreditBalance(tenantId,missingMigration(result.error)?"migration_unavailable":"read_error");
    return result.data?normalizeCreditBalance(result.data):unavailableCreditBalance(tenantId,"account_missing");
  }catch{return unavailableCreditBalance(tenantId,"read_error");}
}

export async function loadCreditPlatformControl(client:unknown):Promise<CreditPlatformControl>{
  try{
    const db=client as{from:(table:string)=>{select:(columns:string)=>{eq:(column:string,value:boolean)=>{maybeSingle:()=>Promise<{data:PlatformRow|null;error:QueryError|null}>}}}};
    const result=await db.from("ai_product_credit_platform_control").select(platformColumns).eq("singleton",true).maybeSingle();
    if(result.error){const unavailable=missingMigration(result.error);return{availability:unavailable?"migration_unavailable":"read_error",killSwitch:true,ownerUsdMicrosCap:0,spentUsdMicros:0,reservedUsdMicros:0,message:unavailable?"Credit ledger migration is not applied.":"Platform credit controls could not be read."};}
    if(!result.data)return{availability:"read_error",killSwitch:true,ownerUsdMicrosCap:0,spentUsdMicros:0,reservedUsdMicros:0,message:"Platform control row is missing."};
    return{availability:"ready",killSwitch:Boolean(result.data.kill_switch),ownerUsdMicrosCap:finiteNonNegative(result.data.owner_usd_micros_cap),spentUsdMicros:finiteNonNegative(result.data.spent_usd_micros),reservedUsdMicros:finiteNonNegative(result.data.reserved_usd_micros),message:"Platform credit controls are available."};
  }catch{return{availability:"read_error",killSwitch:true,ownerUsdMicrosCap:0,spentUsdMicros:0,reservedUsdMicros:0,message:"Platform credit controls could not be read."};}
}
