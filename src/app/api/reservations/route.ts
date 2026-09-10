import { NextResponse } from "next/server";
import {cookies} from "next/headers";
import {guestOrdersCookie,readGuestOrders,signGuestOrders} from "@/lib/guest-orders";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicTenantBySlug } from "@/lib/queries/tenants";
import { reservationRequestSchema,reservationsClient } from "@/lib/reservations";
export async function POST(request:Request){
 if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")||request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({error:"Откройте бронирование на сайте магазина."},{status:403});
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY||!process.env.NEXT_PUBLIC_SUPABASE_URL)return NextResponse.json({error:"Бронирование временно недоступно."},{status:503});
 try{
  const raw=await request.text();if(raw.length>64000)return NextResponse.json({error:"Слишком много данных."},{status:413});
  const parsed=reservationRequestSchema.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:"Проверьте контакты и товары."},{status:400});
  const input=parsed.data,admin=createAdminClient();
  const {data:tenant}=await getPublicTenantBySlug(admin,input.slug);
  if(!tenant)return NextResponse.json({error:"Магазин недоступен."},{status:404});
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const receipts=readGuestOrders((await cookies()).get(guestOrdersCookie)?.value,secret);
  const {data,error}=await reservationsClient(admin).rpc("create_merchandise_reservation",{p_tenant_id:tenant.id,p_request_id:input.requestId,p_name:input.name,p_phone:input.phone,p_items:input.items.map(item=>({variant_id:item.variantId,qty:item.qty}))});
  if(error||!data?.[0])return NextResponse.json({error:error?.message.includes("Request conflict")?"Эта попытка уже использована с другими данными. Обновите корзину.":error?.message.includes("limit")?"Слишком много активных бронирований. Свяжитесь с магазином.":"Не удалось забронировать. Проверьте наличие товара и условия магазина."},{status:409});
  const row=data[0];const response=NextResponse.json({orderNumber:row.order_number,total:row.total,expiresAt:row.expires_at,reservationStatus:row.reservation_status},{headers:{"Cache-Control":"private, no-store"}});
  response.cookies.set(guestOrdersCookie,signGuestOrders([...receipts.filter(receipt=>receipt.id!==row.order_id),{id:row.order_id,tenant:tenant.id,expires:Date.now()+30*86400000}],secret),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:30*86400});return response;
 }catch{return NextResponse.json({error:"Бронь не подтверждена. Данные корзины сохранены."},{status:400});}
}
