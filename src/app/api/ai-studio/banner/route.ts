import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { tenantHasPlan } from "@/lib/plan-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiStudioBriefSchema } from "@/lib/ai/studio";
import { createMarketingImage, getMarketingImageStatus, MarketingImageError } from "@/lib/ai/marketing-image-provider";

export async function POST(request: Request) {
  try {
    const context = await getSessionContext();
    if (!context?.user) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
    if (!["owner", "superadmin"].includes(context.role)) return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    if (!context.tenantId) return NextResponse.json({ error: "Магазин не привязан к аккаунту." }, { status: 400 });
    if (!await tenantHasPlan(context.tenantId, "standard")) return NextResponse.json({ error: "Баннеры AI Studio доступны на тарифе Premium." }, { status: 403 });
    const imageStatus = getMarketingImageStatus();
    if (process.env.AI_IMAGE_LIVE_ENABLED !== "true" || !imageStatus.configured || imageStatus.provider !== "azure") return NextResponse.json({ error: "Генерация изображений через Azure ещё не подключена на сервере." }, { status: 503 });
    const input = aiStudioBriefSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: "Опишите баннер от 8 до 800 символов." }, { status: 400 });
    const admin = createAdminClient();
    const rpc = admin as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
    const cost = 20;
    const reservation = await rpc.rpc("reserve_ai_credits", { p_tenant_id: context.tenantId, p_cost: cost, p_monthly_allotment: 600 });
    if (reservation.error) {
      const exhausted = reservation.error.message.includes("Insufficient");
      return NextResponse.json({ error: exhausted ? "Лимит AI Studio исчерпан. Пополните кредиты или попробуйте позже." : "AI Studio временно недоступен.", needsTopup: exhausted }, { status: exhausted ? 429 : 503 });
    }
    const creditsRemaining = typeof reservation.data === "number" ? reservation.data : null;
    let uploadedPath: string | null = null;
    let result;
    try { result = await createMarketingImage(`Рекламный баннер для магазина. ${input.data.brief}. Без текста, логотипов, людей и изображений одежды или конкретного товара; чистая абстрактная брендовая композиция.`, async image => {
      uploadedPath = `${context.tenantId}/ai/banners/${crypto.randomUUID()}.png`;
      const bucket = admin.storage.from("product-images");
      const upload = await bucket.upload(uploadedPath, image.bytes, { contentType: image.contentType, upsert: false });
      if (upload.error) throw new MarketingImageError("Не удалось сохранить созданное изображение.", 503);
      return bucket.getPublicUrl(uploadedPath).data.publicUrl;
    }); }
    catch (error) { if (uploadedPath) await admin.storage.from("product-images").remove([uploadedPath]); await rpc.rpc("refund_ai_credits", { p_tenant_id: context.tenantId, p_cost: cost }); throw error; }
    const saved = await admin.from("ai_studio_generations").insert({ tenant_id: context.tenantId, requested_by: context.user?.id ?? null, intent: "banner", input_summary: input.data.brief, output: { imageUrl: result.imageUrl }, model: result.model, usage: { provider: result.provider, credits: cost }, credit_cost: cost }).select("id").single();
    if (saved.error || !saved.data) { if (uploadedPath) await admin.storage.from("product-images").remove([uploadedPath]); await rpc.rpc("refund_ai_credits", { p_tenant_id: context.tenantId, p_cost: cost }); return NextResponse.json({ error: "Баннер создан, но журнал не сохранился. Кредит возвращён." }, { status: 500 }); }
    return NextResponse.json({ imageUrl: result.imageUrl, generationId: saved.data.id, creditsRemaining });
  } catch (error) {
    const status = error instanceof MarketingImageError && error.status && error.status < 500 ? error.status : 502;
    return NextResponse.json({ error: status === 429 ? "Генератор баннеров достиг временного лимита. Попробуйте немного позже." : "Не удалось создать баннер. Попробуйте ещё раз." }, { status });
  }
}
