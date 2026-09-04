import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { tenantHasPlan } from "@/lib/plan-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiStudioRequestSchema, createAiStudioDraft, createAiStudioStructure, getAiStudioStatus } from "@/lib/ai/studio";
import { AzureFoundryError } from "@/lib/ai/azure-foundry";

export async function POST(request: Request) {
  try {
    const context = await getSessionContext();
    if (!context?.user) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
    if (!["owner", "superadmin"].includes(context.role)) return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    if (!context.tenantId) return NextResponse.json({ error: "Магазин не привязан к аккаунту." }, { status: 400 });
    if (!await tenantHasPlan(context.tenantId, "standard")) return NextResponse.json({ error: "AI Studio доступен на тарифе «Бренд»." }, { status: 403 });
    const input = aiStudioRequestSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: "Опишите задачу от 8 до 800 символов и выберите разрешённый сценарий." }, { status: 400 });
    if (!getAiStudioStatus().configured) return NextResponse.json({ error: "AI Studio готов в интерфейсе, но серверная Azure-настройка ещё не завершена." }, { status: 503 });
    const admin = createAdminClient();
    const creditCost = input.data.intent === "catalog_structure" ? 5 : 1;
    const rpc = admin as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
    const reservation = await rpc.rpc("reserve_ai_credits", { p_tenant_id: context.tenantId, p_cost: creditCost, p_monthly_allotment: 120 });
    if (reservation.error) return NextResponse.json({ error: reservation.error.message.includes("Insufficient") ? "Лимит AI Studio исчерпан. Пополните кредиты или попробуйте позже." : "AI Studio ещё не готов: примените миграцию кредитов." }, { status: reservation.error.message.includes("Insufficient") ? 429 : 503 });
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const [{ count: tenantCount }, { count: platformCount }] = await Promise.all([
      admin.from("ai_studio_generations").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).gte("created_at", since),
      admin.from("ai_studio_generations").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);
    const tenantLimit = Number(process.env.AZURE_AI_MAX_TENANT_DAILY_REQUESTS ?? 5);
    const platformLimit = Number(process.env.AZURE_AI_MAX_PLATFORM_DAILY_REQUESTS ?? 250);
    if ((tenantCount ?? 0) >= tenantLimit) return NextResponse.json({ error: "Дневной лимит AI Studio для магазина исчерпан. Попробуйте завтра." }, { status: 429 });
    if ((platformCount ?? 0) >= platformLimit) return NextResponse.json({ error: "AI Studio временно занят. Попробуйте позднее." }, { status: 429 });
    let result;
    try { result = input.data.intent === "catalog_structure" ? await createAiStudioStructure(input.data.brief) : await createAiStudioDraft(input.data.intent, input.data.brief); }
    catch (error) { await rpc.rpc("refund_ai_credits", { p_tenant_id: context.tenantId, p_cost: creditCost }); throw error; }
    const output = "structure" in result ? result.structure : result.draft;
    const saved = await admin.from("ai_studio_generations").insert({ tenant_id: context.tenantId, requested_by: context.user?.id ?? null, intent: input.data.intent, input_summary: input.data.brief, output, model: getAiStudioStatus().deployment, usage: result.usage ?? {} });
    if (saved.error) { await rpc.rpc("refund_ai_credits", { p_tenant_id: context.tenantId, p_cost: creditCost }); return NextResponse.json({ error: "Черновик создан, но не удалось сохранить журнал. Кредит возвращён." }, { status: 500 }); }
    return NextResponse.json("structure" in result ? { structure: result.structure } : { draft: result.draft });
  } catch (error) {
    const status = error instanceof AzureFoundryError && error.status && error.status < 500 ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось создать черновик AI Studio." }, { status });
  }
}
