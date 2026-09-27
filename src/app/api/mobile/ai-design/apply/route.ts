import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileOwner } from "@/lib/mobile-auth";
import { aiStudioDesignSchema } from "@/lib/ai/studio-schemas";
import { proposedDesignSettings } from "@/lib/ai/design-settings";
import { computeEntitlement } from "@/lib/entitlement";

const inputSchema=z.object({tenantId:z.string().uuid(),generationId:z.string().uuid()}).strict();

export async function POST(request:Request){
  const input=inputSchema.safeParse(await request.json().catch(()=>null));
  if(!input.success)return NextResponse.json({error:"Выберите сохранённое предложение."},{status:400});
  const context=await getMobileOwner(request,input.data.tenantId);
  if(!context)return NextResponse.json({error:"Войдите как владелец магазина."},{status:401});
  const{admin,tenantId}=context;
  const [tenant,generation,current]=await Promise.all([
    admin.from("tenants").select("status,plan,next_plan,trial_ends_at").eq("id",tenantId).maybeSingle(),
    admin.from("ai_studio_generations").select("output").eq("id",input.data.generationId).eq("tenant_id",tenantId).eq("intent","store_design").maybeSingle(),
    admin.from("tenant_storefront_settings").select("brand_color,hero_image_url").eq("tenant_id",tenantId).maybeSingle(),
  ]);
  if(tenant.error||!tenant.data||generation.error||current.error)return NextResponse.json({error:"Не удалось прочитать оформление."},{status:503});
  if(!computeEntitlement(tenant.data).active)return NextResponse.json({error:"Пробный период или подписка завершены."},{status:403});
  if(!generation.data)return NextResponse.json({error:"Предложение не найдено."},{status:404});
  const design=aiStudioDesignSchema.safeParse(generation.data.output);
  if(!design.success)return NextResponse.json({error:"Предложение нужно подготовить заново."},{status:422});
  const saved=await admin.from("tenant_storefront_settings").update({...proposedDesignSettings(design.data,current.data),updated_at:new Date().toISOString()}).eq("tenant_id",tenantId).select("tenant_id").maybeSingle();
  if(saved.error||!saved.data)return NextResponse.json({error:"Не удалось применить оформление."},{status:503});
  revalidatePath(`/s/[slug]`,"page");
  return NextResponse.json({saved:true},{headers:{"Cache-Control":"private, no-store"}});
}
