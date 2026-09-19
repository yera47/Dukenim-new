import {NextResponse} from "next/server";
import {getSessionContext} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {getPolarClient,getPolarCrmSetupProductId} from "@/lib/polar";

export async function POST(request:Request){
  const context=await getSessionContext();
  if(!context?.user||context.role!=="owner"||!context.tenantId)return NextResponse.json({error:"Оплатить подключение может только владелец магазина."},{status:403});
  const productId=getPolarCrmSetupProductId();
  if(!productId)return NextResponse.json({error:"Платёж 70 000 ₸ ещё не подключён к провайдеру. Заявка и статус подключения сохранены."},{status:503});
  const admin=createAdminClient();
  const body=await request.json().catch(()=>null) as {chargeId?:unknown}|null;
  const chargeId=typeof body?.chargeId==="string"&&/^[0-9a-f-]{36}$/i.test(body.chargeId)?body.chargeId:null;
  if(!chargeId)return NextResponse.json({error:"Счёт не найден."},{status:400});
  const [charge,tenant]=await Promise.all([
    admin.from("crm_setup_charges").select("id,amount_kzt,status,integration_request_id").eq("id",chargeId).eq("tenant_id",context.tenantId).eq("status","awaiting_payment").maybeSingle(),
    admin.from("tenants").select("plan").eq("id",context.tenantId).single(),
  ]);
  if(charge.error||!charge.data)return NextResponse.json({error:"Счёт появится только после подтверждённого подключения CRM."},{status:409});
  if(tenant.error||tenant.data?.plan!=="basic")return NextResponse.json({error:"На тарифе «Бренд» подключение CRM уже включено."},{status:409});
  const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL??new URL(request.url).origin).replace(/\/$/,"");
  try{
    const checkout=await getPolarClient().checkouts.create({products:[productId],externalCustomerId:context.tenantId,customerEmail:context.user.email??undefined,metadata:{tenantId:context.tenantId,purchaseType:"crm_setup",chargeId:charge.data.id,amountKzt:"70000"},successUrl:`${siteUrl}/admin/integrations?crmPayment=success`});
    return NextResponse.json({url:checkout.url});
  }catch{return NextResponse.json({error:"Не удалось открыть защищённую оплату. Попробуйте ещё раз или напишите в поддержку."},{status:502});}
}
