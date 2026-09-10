import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {guestOrdersCookie,readGuestOrders} from "@/lib/guest-orders";
import {reservationsClient} from "@/lib/reservations";
export async function GET(request:Request){
 const headers={"Cache-Control":"private, no-store"};
 const slug=new URL(request.url).searchParams.get("slug")??"";
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return NextResponse.json({error:"Магазин не найден"},{status:400,headers});
 const receipts=readGuestOrders((await cookies()).get(guestOrdersCookie)?.value,process.env.SUPABASE_SERVICE_ROLE_KEY??"");
 if(!receipts.length)return NextResponse.json({orders:[]},{headers});
 try{
  const client=createAdminClient();const{data:tenant}=await client.from("tenants").select("id").eq("slug",slug).maybeSingle();
  const ids=receipts.filter(receipt=>receipt.tenant===tenant?.id).map(receipt=>receipt.id);
  if(!tenant||!ids.length)return NextResponse.json({orders:[]},{headers});
  const result=await client.from("orders").select("id,order_number,status,total,delivery_method,fulfilment_snapshot,created_at").eq("tenant_id",tenant.id).in("id",ids).order("created_at",{ascending:false});
  if(result.error)throw result.error;
  const reservations=await reservationsClient(client).from("merchandise_reservations").select("order_id,status,expires_at").eq("tenant_id",tenant.id).in("order_id",ids);
  if(reservations.error)throw reservations.error;
  return NextResponse.json({orders:result.data?.map(order=>({...order,reservation:reservations.data?.find(row=>row.order_id===order.id)??null}))},{headers});
 }catch{return NextResponse.json({error:"Не удалось обновить статусы. Попробуйте позже."},{status:503,headers});}
}
