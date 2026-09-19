import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {guestOrdersCookie,readGuestOrders} from "@/lib/guest-orders";
import {buyerIdentity,setBuyerCookie} from "@/lib/buyer-identity";
import {loyaltyClient} from "@/lib/loyalty-db";
export async function GET(request:Request){
 const headers={"Cache-Control":"private, no-store"};const params=new URL(request.url).searchParams;
 const slug=params.get("slug")??"";const offset=Number(params.get("offset")??0);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!Number.isInteger(offset)||offset<0||offset>1000000)return NextResponse.json({error:"Магазин не найден"},{status:400,headers});
 try{
  const client=createAdminClient();const{data:tenant}=await client.from("tenants").select("id").eq("slug",slug).maybeSingle();
  if(!tenant)return NextResponse.json({error:"Магазин не найден"},{status:404,headers});
  const buyer=await buyerIdentity();const db=loyaltyClient(client);
  const receipts=readGuestOrders((await cookies()).get(guestOrdersCookie)?.value,process.env.SUPABASE_SERVICE_ROLE_KEY??"").filter(r=>r.tenant===tenant.id).map(r=>r.id);
  const claim=await db.rpc("claim_buyer_orders",{p_tenant:tenant.id,p_user:buyer.userId,p_guest_hash:buyer.hash,p_receipts:receipts});
  if(claim.error)throw claim.error;
  const history=await db.rpc("buyer_history",{p_tenant:tenant.id,p_user:buyer.userId,p_guest_hash:buyer.hash,p_offset:offset});
  if(history.error)throw history.error;
  const response=NextResponse.json({...history.data as Record<string,unknown>,signedIn:Boolean(buyer.userId)},{headers});setBuyerCookie(response,buyer.token);return response;
 }catch{return NextResponse.json({error:"Не удалось загрузить заказы и карту. Попробуйте позже."},{status:503,headers});}
}
