import"server-only";
import{NextResponse}from"next/server";
import{normalizePaddleEntitlementEvent,paddleSandboxReadiness,PaddleSignatureError,verifyPaddleSignature}from"@/lib/billing/paddle-adapter";

export async function POST(request:Request){
  const readiness=paddleSandboxReadiness();const secret=process.env.PADDLE_WEBHOOK_SECRET?.trim();
  if(!secret)return NextResponse.json({error:"Paddle webhook is not configured."},{status:503});
  const rawBody=await request.text();const signatureHeader=request.headers.get("paddle-signature")??"";
  try{verifyPaddleSignature({rawBody,signatureHeader,secret});}catch(error){return NextResponse.json({error:error instanceof PaddleSignatureError?error.message:"Invalid Paddle webhook."},{status:403});}
  let payload:unknown;try{payload=JSON.parse(rawBody);}catch{return NextResponse.json({error:"Invalid JSON."},{status:400});}
  const event=normalizePaddleEntitlementEvent(payload);
  if(!event)return NextResponse.json({received:true,ignored:true});
  if(!readiness.available)return NextResponse.json({error:"Paddle sandbox entitlement persistence is not enabled.",reasons:readiness.reasons},{status:503});
  // Deliberately return a retryable response until the atomic Supabase repository
  // is created and verified locally. Never acknowledge an entitlement event that was not persisted.
  return NextResponse.json({error:"Atomic Paddle entitlement repository is not installed."},{status:503});
}
