import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { tenantHasPlan } from "@/lib/plan-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiStudioBriefSchema } from "@/lib/ai/studio";
import { createFalImage, FalImageError, getFalImageStatus } from "@/lib/ai/fal";

export async function POST(request: Request) {
  try {
    const context = await getSessionContext();
    if (!context?.user) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
    if (!["owner", "superadmin"].includes(context.role)) return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    if (!context.tenantId) return NextResponse.json({ error: "Магазин не привязан к аккаунту." }, { status: 400 });
    if (!await tenantHasPlan(context.tenantId, "standard")) return NextResponse.json({ error: "Баннеры AI Studio доступны на тарифе «Бренд»." }, { status: 403 });
    if (!getFalImageStatus().configured) return NextResponse.json({ error: "Генерация изображений ещё не подключена на сервере." }, { status: 503 });
    const input = aiStudioBriefSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: "Опишите баннер от 8 до 800 символов." }, { status: 400 });
    const admin = createAdminClient();
    const rpc = admin as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
    const cost = 20;
    const reservation = await rpc.rpc("reserve_ai_credits", { p_tenant_id: context.tenantId, p_cost: cost, p_monthly_allotment: 120 });
    if (reservation.error) return NextResponse.json({ error: reservation.error.message.includes("Insufficient") ? "Лимит AI Studio исчерпан. Пополните кредиты или попробуйте позже." : "AI Studio ещё не готов: примените миграцию кредитов." }, { status: reservation.error.message.includes("Insufficient") ? 429 : 503 });
    let result;
    try { result = await createFalImage(`Рекламный баннер для магазина. ${input.data.brief}. Без текста, логотипов, людей и изображений одежды или конкретного товара; чистая абстрактная брендовая композиция.`); }
    catch (error) { await rpc.rpc("refund_ai_credits", { p_tenant_id: context.tenantId, p_cost: cost }); throw error; }
    const saved = await admin.from("ai_studio_generations").insert({ tenant_id: context.tenantId, requested_by: context.user?.id ?? null, intent: "banner", input_summary: input.data.brief, output: { imageUrl: result.imageUrl }, model: getFalImageStatus().model, usage: { provider: "fal.ai", credits: cost } });
    if (saved.error) { await rpc.rpc("refund_ai_credits", { p_tenant_id: context.tenantId, p_cost: cost }); return NextResponse.json({ error: "Баннер создан, но журнал не сохранился. Кредит возвращён." }, { status: 500 }); }
    return NextResponse.json({ imageUrl: result.imageUrl });
  } catch (error) {
    const status = error instanceof FalImageError && error.status && error.status < 500 ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось создать баннер." }, { status });
  }
}
