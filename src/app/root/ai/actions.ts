"use server";

import{revalidatePath}from"next/cache";
import{requireRole}from"@/lib/auth";
import{createClient}from"@/lib/supabase/server";
import{createAdminClient}from"@/lib/supabase/admin";
import{createPlatformAuditEvent}from"@/lib/queries/root";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const integer=(form:FormData,name:string,max:number)=>{const value=Number(form.get(name));if(!Number.isSafeInteger(value)||value<0||value>max)throw new Error(`Invalid ${name}.`);return value;};
async function rootContext(){const context=await requireRole(["superadmin"]);if(!context.user)throw new Error("Superadmin sign-in is required.");return{actorId:context.user.id,auditClient:createAdminClient(),rpcClient:await createClient()};}

export async function grantCompensationCredits(form:FormData){
  const{actorId,auditClient,rpcClient}=await rootContext();
  const tenantId=String(form.get("tenantId")??""),requestId=String(form.get("requestId")??"");
  const credits=integer(form,"credits",100_000),reason=String(form.get("reason")??"").trim();
  if(!UUID.test(tenantId)||!UUID.test(requestId)||credits<1||reason.length<8||reason.length>1000)throw new Error("Check tenant, credits, request ID and compensation reason.");
  const eventKey=`compensation:${requestId}`;
  const requested=await createPlatformAuditEvent(auditClient,{actorId,tenantId,action:"ai_credit.compensation_requested",reason,metadata:{credits,eventKey}});
  if(requested.error)throw new Error("Audit is unavailable. No credits were granted.");
  const rpc=rpcClient as unknown as{rpc:(name:"admin_grant_ai_product_credits",args:{p_tenant_id:string;p_credits:number;p_reason:string;p_event_key:string})=>Promise<{data:number|null;error:{message:string}|null}>};
  const result=await rpc.rpc("admin_grant_ai_product_credits",{p_tenant_id:tenantId,p_credits:credits,p_reason:reason,p_event_key:eventKey});
  if(result.error||result.data===null)throw new Error(result.error?.message??"Compensation grant was not applied.");
  await createPlatformAuditEvent(auditClient,{actorId,tenantId,action:"ai_credit.compensation_applied",reason,metadata:{credits,eventKey,balance:result.data}});
  revalidatePath("/root/ai");revalidatePath("/admin/settings/usage");
}

export async function configureCreditControls(form:FormData){
  const{actorId,auditClient,rpcClient}=await rootContext();
  const tenantId=String(form.get("tenantId")??""),reason=String(form.get("reason")??"").trim();
  if(!UUID.test(tenantId)||reason.length<8||reason.length>1000)throw new Error("Check tenant and control-change reason.");
  const generationEnabled=String(form.get("generationEnabled"))==="true",killSwitch=String(form.get("killSwitch"))==="true";
  const tenantCreditCap=integer(form,"tenantCreditCap",10_000_000);
  const tenantUsdMicrosCap=integer(form,"tenantUsdMicrosCap",10_000_000_000);
  const ownerUsdMicrosCap=integer(form,"ownerUsdMicrosCap",100_000_000_000);
  const metadata={generationEnabled,killSwitch,tenantCreditCap,tenantUsdMicrosCap,ownerUsdMicrosCap};
  const requested=await createPlatformAuditEvent(auditClient,{actorId,tenantId,action:"ai_credit.controls_requested",reason,metadata});
  if(requested.error)throw new Error("Audit is unavailable. Controls were not changed.");
  const rpc=rpcClient as unknown as{rpc:(name:"admin_configure_ai_credit_controls",args:{p_tenant_id:string;p_generation_enabled:boolean;p_tenant_credit_cap:number;p_tenant_usd_micros_cap:number;p_kill_switch:boolean;p_owner_usd_micros_cap:number})=>Promise<{data:null;error:{message:string}|null}>};
  const result=await rpc.rpc("admin_configure_ai_credit_controls",{p_tenant_id:tenantId,p_generation_enabled:generationEnabled,p_tenant_credit_cap:tenantCreditCap,p_tenant_usd_micros_cap:tenantUsdMicrosCap,p_kill_switch:killSwitch,p_owner_usd_micros_cap:ownerUsdMicrosCap});
  if(result.error)throw new Error(result.error.message||"Credit controls were not changed.");
  await createPlatformAuditEvent(auditClient,{actorId,tenantId,action:"ai_credit.controls_changed",reason,metadata});
  revalidatePath("/root/ai");revalidatePath("/admin/settings/usage");
}
