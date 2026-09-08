import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { tenantEntitlement } from "@/lib/plan-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiStudioRequestSchema, createAiStudioDesign, createAiStudioDraft, createAiStudioStructure, getAiStudioStatus } from "@/lib/ai/studio";
import { AzureFoundryError } from "@/lib/ai/azure-foundry";
import { createConsultation } from "@/lib/ai/consultation";
import { consultationSchema, type ConsultationTurn } from "@/lib/ai/consultation-schema";
import { createClient } from "@/lib/supabase/server";
import { brandColorsSchema } from "@/lib/brand-materials";

export async function GET() {
  const context = await getSessionContext();
  if (!context?.user || !context.tenantId || !["owner","superadmin"].includes(context.role)) return NextResponse.json({error:"Войдите в аккаунт владельца."},{status:401});
  const client = await createClient();
  const result = await client.from("ai_studio_generations").select("id,input_summary,output").eq("tenant_id",context.tenantId).eq("intent","consultation").order("created_at",{ascending:false}).limit(30);
  if (result.error) return NextResponse.json({error:"Не удалось загрузить разговор."},{status:503});
  const turns:ConsultationTurn[]=[];
  for(const row of (result.data??[]).reverse()) { const response=consultationSchema.safeParse(row.output); if(response.success)turns.push({id:row.id,message:row.input_summary,response:response.data}); }
  return NextResponse.json({turns},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(request: Request) {
  try {
    const context = await getSessionContext();
    if (!context?.user) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
    if (!["owner", "superadmin"].includes(context.role)) return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    if (!context.tenantId) return NextResponse.json({ error: "Магазин не привязан к аккаунту." }, { status: 400 });
    const entitlement = await tenantEntitlement(context.tenantId);
    if (!entitlement.active) return NextResponse.json({ error: "Бесплатный период или подписка завершены. Выберите тариф, чтобы продолжить." }, { status: 403 });
    const input = aiStudioRequestSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: "Сообщение должно содержать от 2 до 800 символов; задание редактору — не менее 8." }, { status: 400 });
    if (!getAiStudioStatus().configured) return NextResponse.json({ error: "AI Studio готов в интерфейсе, но серверная Azure-настройка ещё не завершена." }, { status: 503 });
    const admin = createAdminClient();
    const tenant = await admin.from("tenants").select("business_vertical,name,catalog_name,catalog_status").eq("id", context.tenantId).maybeSingle();
    if (tenant.error || !tenant.data) return NextResponse.json({ error: "Не удалось определить профиль магазина." }, { status: 404 });
    const history:ConsultationTurn[]=[];
    let shopContext:unknown=tenant.data;
    if(input.data.intent==="consultation") {
      const fulfilment=await admin.from("tenant_settings").select("delivery_enabled,pickup_enabled,pickup_location,min_order").eq("tenant_id",context.tenantId).maybeSingle();
      if(fulfilment.error) return NextResponse.json({error:"Не удалось прочитать условия магазина. Попробуйте позже."},{status:503});
      shopContext={...tenant.data,fulfilment:fulfilment.data};
      const brand=await admin.from("tenant_brand_materials").select("notes,colors").eq("tenant_id",context.tenantId).maybeSingle();
      if(brand.error)return NextResponse.json({error:"Не удалось прочитать правила бренда."},{status:503});
      shopContext={...tenant.data,fulfilment:fulfilment.data,brand:brand.data?{notes:brand.data.notes.slice(0,6000),colors:brandColorsSchema.safeParse(brand.data.colors).data??[]}:null};
      const previous = await admin.from("ai_studio_generations").select("id,input_summary,output").eq("tenant_id",context.tenantId).eq("intent","consultation").order("created_at",{ascending:false}).limit(8);
      if(previous.error) return NextResponse.json({error:"Не удалось восстановить контекст разговора. Попробуйте позже."},{status:503});
      for(const row of (previous.data??[]).reverse()) { const response=consultationSchema.safeParse(row.output); if(response.success)history.push({id:row.id,message:row.input_summary,response:response.data}); }
    }
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const [tenantUsage, platformUsage] = await Promise.all([
      admin.from("ai_studio_generations").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).gte("created_at", since),
      admin.from("ai_studio_generations").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);
    if (tenantUsage.error || platformUsage.error) return NextResponse.json({ error: "Не удалось проверить лимиты AI Studio. Попробуйте позже." }, { status: 503 });
    const tenantLimit = Math.max(1, Number(process.env.AZURE_AI_MAX_TENANT_DAILY_REQUESTS) || 5);
    const platformLimit = Math.max(1, Number(process.env.AZURE_AI_MAX_PLATFORM_DAILY_REQUESTS) || 250);
    const tenantCount = tenantUsage.count;
    const platformCount = platformUsage.count;
    if ((tenantCount ?? 0) >= tenantLimit) return NextResponse.json({ error: "Дневной лимит AI Studio для магазина исчерпан. Попробуйте завтра." }, { status: 429 });
    if ((platformCount ?? 0) >= platformLimit) return NextResponse.json({ error: "AI Studio временно занят. Попробуйте позднее." }, { status: 429 });
    const creditCost = input.data.intent === "catalog_structure" ? 5 : input.data.intent === "store_design" ? 3 : 1;
    const rpc = admin as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
    const reservation = await rpc.rpc("reserve_ai_credits", { p_tenant_id: context.tenantId, p_cost: creditCost, p_monthly_allotment: 120 });
    if (reservation.error) {
      const exhausted = reservation.error.message.includes("Insufficient");
      return NextResponse.json({ error: exhausted ? "Лимит AI Studio исчерпан. Пополните кредиты или попробуйте позже." : "AI Studio временно недоступен.", needsTopup: exhausted }, { status: exhausted ? 429 : 503 });
    }
    const creditsRemaining = typeof reservation.data === "number" ? reservation.data : null;
    let result;
    try { result = input.data.intent === "consultation" ? await createConsultation(input.data.brief,shopContext,history) : input.data.intent === "catalog_structure" ? await createAiStudioStructure(input.data.brief) : input.data.intent === "store_design" ? await createAiStudioDesign(input.data.brief, tenant.data.business_vertical ?? "other", entitlement.plan) : await createAiStudioDraft(input.data.intent, input.data.brief); }
    catch (error) { await rpc.rpc("refund_ai_credits", { p_tenant_id: context.tenantId, p_cost: creditCost }); throw error; }
    const output = "consultation" in result ? result.consultation : "structure" in result ? result.structure : "design" in result ? result.design : result.draft;
    const saved = await admin.from("ai_studio_generations").insert({ tenant_id: context.tenantId, requested_by: context.user?.id ?? null, intent: input.data.intent, input_summary: input.data.brief, output, model: getAiStudioStatus().deployment, usage: result.usage ?? {}, credit_cost: creditCost }).select("id").single();
    if (saved.error || !saved.data) { const refund=await rpc.rpc("refund_ai_credits", { p_tenant_id: context.tenantId, p_cost: creditCost }); return NextResponse.json({ error: refund.error ? "Ответ не сохранён. Возврат лимита не подтверждён — обратитесь в поддержку." : "Ответ не сохранён. Использованный лимит возвращён." }, { status: 500 }); }
    return NextResponse.json("consultation" in result ? {consultation:result.consultation,generationId:saved.data.id} : "structure" in result ? { structure: result.structure, creditsRemaining, generationId: saved.data.id } : "design" in result ? { design: result.design, creditsRemaining, generationId: saved.data.id } : { draft: result.draft, creditsRemaining, generationId: saved.data.id });
  } catch (error) {
    const status = error instanceof AzureFoundryError && error.status && error.status < 500 ? error.status : 502;
    return NextResponse.json({ error: status === 429 ? "AI Studio достиг временного лимита. Попробуйте немного позже." : "Не удалось создать черновик AI Studio. Попробуйте ещё раз." }, { status });
  }
}
