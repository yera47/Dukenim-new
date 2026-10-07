import{createHmac,timingSafeEqual}from"node:crypto";

export type PaddleSandboxReadiness={available:boolean;environment:"sandbox"|null;reasons:string[];priceId:string|null};

export function paddleSandboxReadiness(env:NodeJS.ProcessEnv=process.env):PaddleSandboxReadiness{
  const reasons:string[]=[];
  if(env.PADDLE_ENV?.trim()!=="sandbox")reasons.push("PADDLE_ENV must be sandbox.");
  if(env.PADDLE_SANDBOX_ENABLED?.trim().toLowerCase()!=="true")reasons.push("Sandbox checkout gate is disabled.");
  if(env.PADDLE_PROVIDER_REVIEW_APPROVED?.trim().toLowerCase()!=="true")reasons.push("Paddle product eligibility review is not confirmed.");
  if(env.PREMIUM_BILLING_PERIOD_CONFIRMED?.trim()!=="monthly")reasons.push("Premium billing period is not confirmed by the owner.");
  if(!env.PADDLE_API_KEY?.trim())reasons.push("Paddle sandbox API key is missing.");
  if(!env.PADDLE_WEBHOOK_SECRET?.trim())reasons.push("Paddle webhook secret is missing.");
  const priceId=env.PADDLE_PREMIUM_MONTHLY_PRICE_ID?.trim()||null;
  if(!priceId)reasons.push("Paddle Premium monthly price id is missing.");
  return{available:reasons.length===0,environment:env.PADDLE_ENV?.trim()==="sandbox"?"sandbox":null,reasons,priceId};
}

export class PaddleSignatureError extends Error{}

export function verifyPaddleSignature(input:{rawBody:string;signatureHeader:string;secret:string;nowMs?:number;toleranceSeconds?:number}){
  const values=new Map<string,string[]>();
  for(const part of input.signatureHeader.split(";")){const index=part.indexOf("=");if(index<1)continue;const key=part.slice(0,index);const value=part.slice(index+1);values.set(key,[...(values.get(key)??[]),value]);}
  const timestamp=values.get("ts")?.[0];const signatures=values.get("h1")??[];
  if(!timestamp||signatures.length===0||!/^[0-9]+$/.test(timestamp))throw new PaddleSignatureError("Invalid Paddle-Signature header.");
  const age=Math.abs((input.nowMs??Date.now())/1000-Number(timestamp));
  if(age>(input.toleranceSeconds??5))throw new PaddleSignatureError("Paddle webhook timestamp is outside tolerance.");
  const expected=createHmac("sha256",input.secret).update(`${timestamp}:${input.rawBody}`,"utf8").digest("hex");
  const valid=signatures.some(value=>{if(!/^[0-9a-f]{64}$/i.test(value))return false;return timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(value,"hex"));});
  if(!valid)throw new PaddleSignatureError("Invalid Paddle webhook signature.");
  return{timestamp:Number(timestamp)};
}

export type PaddleEntitlementEvent={eventId:string;eventType:string;occurredAt:string;subscriptionId:string;customerId:string;tenantId:string;priceId:string;status:"active"|"trialing"|"paused"|"past_due"|"canceled";periodEnd:string|null;raw:unknown};

const supported=new Set(["subscription.activated","subscription.created","subscription.updated","subscription.resumed","subscription.trialing","subscription.paused","subscription.past_due","subscription.canceled"]);
export function normalizePaddleEntitlementEvent(payload:unknown):PaddleEntitlementEvent|null{
  if(!payload||typeof payload!=="object")return null;const event=payload as Record<string,unknown>;
  const eventType=typeof event.event_type==="string"?event.event_type:"";if(!supported.has(eventType))return null;
  const data=event.data&&typeof event.data==="object"?event.data as Record<string,unknown>:{};
  const custom=data.custom_data&&typeof data.custom_data==="object"?data.custom_data as Record<string,unknown>:{};
  const items=Array.isArray(data.items)?data.items:[];const first=items[0]&&typeof items[0]==="object"?items[0] as Record<string,unknown>:{};const price=first.price&&typeof first.price==="object"?first.price as Record<string,unknown>:{};
  const eventId=typeof event.event_id==="string"?event.event_id:"";const tenantId=typeof custom.tenantId==="string"?custom.tenantId:"";
  const status=typeof data.status==="string"?data.status:"";
  if(!eventId||!/^[-0-9a-f]{36}$/i.test(tenantId)||!data.id||!data.customer_id||!price.id||!["active","trialing","paused","past_due","canceled"].includes(status))return null;
  return{eventId,eventType,occurredAt:typeof event.occurred_at==="string"?event.occurred_at:new Date(0).toISOString(),subscriptionId:String(data.id),customerId:String(data.customer_id),tenantId,priceId:String(price.id),status:status as PaddleEntitlementEvent["status"],periodEnd:typeof data.current_billing_period==="object"&&data.current_billing_period&&typeof(data.current_billing_period as Record<string,unknown>).ends_at==="string"?String((data.current_billing_period as Record<string,unknown>).ends_at):null,raw:payload};
}

export type PaddleEntitlementRepository={applyAtomically:(event:PaddleEntitlementEvent)=>Promise<"applied"|"duplicate">};
export async function applyPaddleEntitlementEvent(event:PaddleEntitlementEvent,repository:PaddleEntitlementRepository){return repository.applyAtomically(event);}

export class PaddleSandboxAdapter{
  constructor(private readonly env:NodeJS.ProcessEnv=process.env,private readonly fetcher:typeof fetch=fetch){}
  readiness(){return paddleSandboxReadiness(this.env);}
  async createPremiumCheckout(input:{tenantId:string;successUrl:string}){
    const readiness=this.readiness();if(!readiness.available||!readiness.priceId)throw new Error(readiness.reasons.join(" "));
    if(!/^[0-9a-f-]{36}$/i.test(input.tenantId))throw new Error("Invalid tenant id.");
    const response=await this.fetcher("https://sandbox-api.paddle.com/transactions",{method:"POST",headers:{Authorization:`Bearer ${this.env.PADDLE_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({items:[{price_id:readiness.priceId,quantity:1}],custom_data:{tenantId:input.tenantId,product:"dukenim_premium"},checkout:{url:input.successUrl}})});
    const body=await response.json() as{data?:{id?:string;checkout?:{url?:string|null}};error?:{detail?:string}};
    if(!response.ok||!body.data?.id)throw new Error(body.error?.detail??"Paddle sandbox transaction was not created.");
    return{transactionId:body.data.id,checkoutUrl:body.data.checkout?.url??null};
  }
}
