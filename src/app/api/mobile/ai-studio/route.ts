import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileOwner } from "@/lib/mobile-auth";
import { createConsultation } from "@/lib/ai/consultation";
import { consultationSchema, type ConsultationTurn } from "@/lib/ai/consultation-schema";
import { getAiStudioStatus } from "@/lib/ai/studio";
import { computeEntitlement } from "@/lib/entitlement";

const inputSchema = z.object({ tenantId: z.string().uuid(), message: z.string().trim().min(2).max(800) }).strict();

export async function POST(request: Request) {
  let raw: unknown;
  try {
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 20_000) return NextResponse.json({ error: "Запрос слишком большой." }, { status: 413 });
    raw = await request.json();
  } catch { return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 }); }
  const input = inputSchema.safeParse(raw);
  if (!input.success) return NextResponse.json({ error: "Сообщение должно содержать от 2 до 800 символов." }, { status: 400 });
  const context = await getMobileOwner(request, input.data.tenantId);
  if (!context) return NextResponse.json({ error: "Войдите как владелец магазина." }, { status: 401 });
  if (!getAiStudioStatus().configured) return NextResponse.json({ error: "AI Studio временно недоступен." }, { status: 503 });
  const { admin, tenantId, user } = context;
  const [tenant, fulfilment, previous, usage] = await Promise.all([
    admin.from("tenants").select("id,name,business_vertical,catalog_name,catalog_status,status,plan,next_plan,trial_ends_at").eq("id", tenantId).maybeSingle(),
    admin.from("tenant_settings").select("delivery_enabled,pickup_enabled,pickup_location,min_order,kaspi_remote_enabled").eq("tenant_id", tenantId).maybeSingle(),
    admin.from("ai_studio_generations").select("id,input_summary,output").eq("tenant_id",tenantId).eq("intent","consultation").order("created_at",{ascending:false}).limit(8),
    admin.from("ai_studio_generations").select("id",{count:"exact",head:true}).eq("tenant_id",tenantId).gte("created_at",new Date(Date.now()-86_400_000).toISOString()),
  ]);
  if (tenant.error || !tenant.data || fulfilment.error || previous.error || usage.error) return NextResponse.json({ error: "Не удалось загрузить контекст магазина." }, { status: 503 });
  if (!computeEntitlement(tenant.data).active) return NextResponse.json({ error: "Бесплатный период или подписка завершены." }, { status: 403 });
  if ((usage.count ?? 0) >= Math.max(1,Number(process.env.AZURE_AI_MAX_TENANT_DAILY_REQUESTS)||5)) return NextResponse.json({error:"Дневной лимит AI Studio исчерпан."},{status:429});
  const history: ConsultationTurn[] = [];
  for (const row of (previous.data ?? []).reverse()) { const parsed=consultationSchema.safeParse(row.output); if(parsed.success)history.push({id:row.id,message:row.input_summary,response:parsed.data}); }
  const rpc=admin as unknown as{rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:{message:string}|null}>};
  const reserved=await rpc.rpc("reserve_ai_credits",{p_tenant_id:tenantId,p_cost:1,p_monthly_allotment:120});
  if(reserved.error)return NextResponse.json({error:reserved.error.message.includes("Insufficient")?"Лимит AI Studio исчерпан.":"AI Studio временно недоступен."},{status:429});
  try {
    const result=await createConsultation(input.data.message,{...tenant.data,fulfilment:fulfilment.data},history);
    const saved=await admin.from("ai_studio_generations").insert({tenant_id:tenantId,requested_by:user.id,intent:"consultation",input_summary:input.data.message,output:result.consultation,model:getAiStudioStatus().deployment,usage:result.usage??{},credit_cost:1}).select("id").single();
    if(saved.error||!saved.data){await rpc.rpc("refund_ai_credits",{p_tenant_id:tenantId,p_cost:1});return NextResponse.json({error:"Ответ не сохранён. Лимит возвращён."},{status:500});}
    return NextResponse.json({id:saved.data.id,consultation:result.consultation},{headers:{"Cache-Control":"private, no-store"}});
  } catch {
    await rpc.rpc("refund_ai_credits",{p_tenant_id:tenantId,p_cost:1});
    return NextResponse.json({error:"AI Studio не успел ответить. Повторите сообщение."},{status:502});
  }
}
