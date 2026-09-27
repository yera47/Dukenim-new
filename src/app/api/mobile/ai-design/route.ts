import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileOwner } from "@/lib/mobile-auth";
import { computeEntitlement } from "@/lib/entitlement";
import { createAiStudioDesign, getAiStudioStatus } from "@/lib/ai/studio";
import type { BusinessVertical } from "@/types/database";

const inputSchema = z.object({ tenantId: z.string().uuid(), brief: z.string().trim().min(8).max(800) }).strict();

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 3000) return NextResponse.json({error:"Запрос слишком большой."},{status:413});
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({error:"Расскажите о бизнесе, ассортименте и покупателях."},{status:400});
  const context = await getMobileOwner(request,input.data.tenantId);
  if (!context) return NextResponse.json({error:"Войдите как владелец магазина."},{status:401});
  if (!getAiStudioStatus().configured) return NextResponse.json({error:"AI Studio временно недоступен."},{status:503});
  const {admin,tenantId,user}=context;
  const [tenant,settings,usage]=await Promise.all([
    admin.from("tenants").select("name,business_vertical,catalog_status,status,plan,next_plan,trial_ends_at").eq("id",tenantId).maybeSingle(),
    admin.from("tenant_storefront_settings").select("template_key,palette_key,hero_title,hero_subtitle").eq("tenant_id",tenantId).maybeSingle(),
    admin.from("ai_studio_generations").select("id",{count:"exact",head:true}).eq("tenant_id",tenantId).gte("created_at",new Date(Date.now()-86_400_000).toISOString()),
  ]);
  if(tenant.error||!tenant.data||settings.error||usage.error)return NextResponse.json({error:"Не удалось загрузить магазин."},{status:503});
  const entitlement=computeEntitlement(tenant.data);
  if(!entitlement.active)return NextResponse.json({error:"Пробный период или подписка завершены."},{status:403});
  if((usage.count??0)>=Math.max(1,Number(process.env.AZURE_AI_MAX_TENANT_DAILY_REQUESTS)||5))return NextResponse.json({error:"Дневной лимит AI Studio исчерпан."},{status:429});
  const rpc=admin as unknown as{rpc:(name:string,args:Record<string,unknown>)=>Promise<{error:{message:string}|null}>};
  const reserved=await rpc.rpc("reserve_ai_credits",{p_tenant_id:tenantId,p_cost:3,p_monthly_allotment:120});
  if(reserved.error)return NextResponse.json({error:"Лимит AI Studio исчерпан."},{status:429});
  try{
    const result=await createAiStudioDesign(input.data.brief,tenant.data.business_vertical as BusinessVertical??"other",entitlement.plan,{...tenant.data,storefront:settings.data});
    const saved=await admin.from("ai_studio_generations").insert({tenant_id:tenantId,requested_by:user.id,intent:"store_design",input_summary:input.data.brief,output:result.design,model:getAiStudioStatus().deployment,usage:result.usage??{},credit_cost:3}).select("id").single();
    if(saved.error||!saved.data)throw new Error("save_failed");
    return NextResponse.json({generationId:saved.data.id,design:result.design},{headers:{"Cache-Control":"private, no-store"}});
  }catch{
    await rpc.rpc("refund_ai_credits",{p_tenant_id:tenantId,p_cost:3});
    return NextResponse.json({error:"Не удалось подготовить оформление. Попробуйте ещё раз."},{status:502});
  }
}
