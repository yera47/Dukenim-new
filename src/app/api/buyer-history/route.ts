import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {guestOrdersCookie,readGuestOrders} from "@/lib/guest-orders";
import {buyerIdentity,setBuyerCookie} from "@/lib/buyer-identity";
import {loyaltyClient} from "@/lib/loyalty-db";
import {buyerClient} from "@/lib/buyer-db";
import {verifiedBuyer} from "@/lib/verified-buyer";
import {kaspiRemoteUrl} from "@/lib/kaspi-remote";
export async function GET(request:Request){
 const headers={"Cache-Control":"private, no-store"};const params=new URL(request.url).searchParams;
 const slug=params.get("slug")??"";const offset=Number(params.get("offset")??0);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!Number.isInteger(offset)||offset<0||offset>1000000)return NextResponse.json({error:"Магазин не найден"},{status:400,headers});
 try{
  const client=createAdminClient();const{data:tenant}=await client.from("tenants").select("id").eq("slug",slug).maybeSingle();
  if(!tenant)return NextResponse.json({error:"Магазин не найден"},{status:404,headers});
  const buyer=await buyerIdentity();const account=buyer.userId?await client.auth.admin.getUserById(buyer.userId):null;const {accountVerified,phoneVerified}=verifiedBuyer(account?.data.user);const verifiedUserId=accountVerified?buyer.userId:null;const db=loyaltyClient(client);
  const receipts=readGuestOrders((await cookies()).get(guestOrdersCookie)?.value,process.env.SUPABASE_SERVICE_ROLE_KEY??"").filter(r=>r.tenant===tenant.id).map(r=>r.id);
  const claim=await db.rpc("claim_buyer_orders",{p_tenant:tenant.id,p_user:verifiedUserId,p_guest_hash:buyer.hash,p_receipts:receipts});
  if(claim.error)throw claim.error;
  const history=await db.rpc("buyer_history",{p_tenant:tenant.id,p_user:verifiedUserId,p_guest_hash:buyer.hash,p_offset:offset});
  if(history.error)throw history.error;
  const rawHistory=history.data&&typeof history.data==="object"&&!Array.isArray(history.data)?history.data as Record<string,unknown>:{};
  const historyOrders=Array.isArray(rawHistory.orders)?rawHistory.orders.filter((row):row is Record<string,unknown>=>Boolean(row)&&typeof row==="object"&&!Array.isArray(row)):[];
  const orderIds=historyOrders.map(row=>row.id).filter((id):id is string=>typeof id==="string"&&/^[0-9a-f-]{36}$/i.test(id));
  const [paymentRows,kaspiSettings]=await Promise.all([
   orderIds.length?client.from("orders").select("id,payment_method,kaspi_invoice_sent_at").eq("tenant_id",tenant.id).in("id",orderIds):Promise.resolve({data:[],error:null}),
   client.from("tenant_settings").select("kaspi_remote_enabled,kaspi_remote_link").eq("tenant_id",tenant.id).maybeSingle(),
  ]);
  if(paymentRows.error||kaspiSettings.error)throw paymentRows.error??kaspiSettings.error;
  const paymentById=new Map((paymentRows.data??[]).map(row=>[row.id,row]));
  const orders=historyOrders.map(row=>({...row,payment_method:paymentById.get(String(row.id))?.payment_method??null,kaspi_invoice_sent_at:paymentById.get(String(row.id))?.kaspi_invoice_sent_at??null}));
  const kaspiRemoteLink=kaspiSettings.data?.kaspi_remote_enabled?kaspiRemoteUrl(kaspiSettings.data.kaspi_remote_link):null;
  const consent=verifiedUserId?await buyerClient(client).from("customers").select("marketing_sms_consent").eq("tenant_id",tenant.id).eq("user_id",verifiedUserId).limit(1).maybeSingle():null;
  const response=NextResponse.json({...rawHistory,orders,kaspiRemoteLink,signedIn:Boolean(verifiedUserId),phoneVerified,smsConsent:Boolean(consent?.data?.marketing_sms_consent)},{headers});setBuyerCookie(response,buyer.token);return response;
 }catch{return NextResponse.json({error:"Не удалось загрузить заказы и карту. Попробуйте позже."},{status:503,headers});}
}
export async function PATCH(request:Request){if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({error:"Недопустимый источник"},{status:403});try{const body=await request.json() as {slug?:unknown;enabled?:unknown};if(typeof body.slug!=="string"||typeof body.enabled!=="boolean")return NextResponse.json({error:"Проверьте настройку"},{status:400});const client=createAdminClient(),buyer=await buyerIdentity();if(!buyer.userId)return NextResponse.json({error:"Войдите по телефону"},{status:401});const account=await client.auth.admin.getUserById(buyer.userId);if(!account.data.user?.phone_confirmed_at)return NextResponse.json({error:"Подтвердите телефон"},{status:401});const{data:tenant}=await client.from("tenants").select("id").eq("slug",body.slug).maybeSingle();if(!tenant)return NextResponse.json({error:"Магазин не найден"},{status:404});const{error}=await buyerClient(client).from("customers").update({marketing_sms_consent:body.enabled,marketing_sms_consent_at:body.enabled?new Date().toISOString():null}).eq("tenant_id",tenant.id).eq("user_id",buyer.userId);if(error)throw error;return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({error:"Настройка не сохранена"},{status:400});}}
