import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { tenantEntitlement } from "@/lib/plan-access";
import { planMonthlyAiCredits } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiCreditCost, aiStudioRequestSchema, createAiStudioBanner, createAiStudioDraft, createAiStudioStructure, getAiStudioBannerStatus, getAiStudioStatus } from "@/lib/ai/studio";
import { AzureFoundryError } from "@/lib/ai/azure-foundry";
import { isPolarConfigured } from "@/lib/polar-plan";

async function storeBannerImage(admin: ReturnType<typeof createAdminClient>, tenantId: string, image: { imageBase64?: string; imageUrl?: string }) {
  let bytes: Uint8Array;
  if (image.imageBase64) {
    bytes = Buffer.from(image.imageBase64, "base64");
  } else if (image.imageUrl) {
    const fetched = await fetch(image.imageUrl);
    if (!fetched.ok) throw new AzureFoundryError("Не удалось сохранить сгенерированный баннер.");
    bytes = new Uint8Array(await fetched.arrayBuffer());
  } else {
    throw new AzureFoundryError("Генератор баннеров не вернул изображение.");
  }
  const path = `${tenantId}/${crypto.randomUUID()}.png`;
  const { error } = await admin.storage.from("ai-banners").upload(path, bytes, { contentType: "image/png", upsert: false });
  if (error) throw new AzureFoundryError("Не удалось сохранить сгенерированный баннер.");
  return admin.storage.from("ai-banners").getPublicUrl(path).data.publicUrl;
}

export async function POST(request: Request) {
  try {
    const context = await getSessionContext();
    if (!context?.user) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
    if (!["owner", "superadmin"].includes(context.role)) return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    if (!context.tenantId) return NextResponse.json({ error: "Магазин не привязан к аккаунту." }, { status: 400 });

    const input = aiStudioRequestSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: "Опишите задачу от 8 до 800 символов и выберите разрешённый сценарий." }, { status: 400 });

    const entitlement = await tenantEntitlement(context.tenantId);
    if (!entitlement.active) return NextResponse.json({ error: "Подписка неактивна. Откройте «Тариф», чтобы продолжить." }, { status: 403 });

    if (input.data.intent === "banner" ? !getAiStudioBannerStatus().configured : !getAiStudioStatus().configured) {
      return NextResponse.json({ error: "AI Studio готов в интерфейсе, но серверная настройка для этого сценария ещё не завершена." }, { status: 503 });
    }

    const admin = createAdminClient();
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count: platformCount } = await admin.from("ai_studio_generations").select("id", { count: "exact", head: true }).gte("created_at", since);
    const platformLimit = Number(process.env.AZURE_AI_MAX_PLATFORM_DAILY_REQUESTS ?? 250);
    if ((platformCount ?? 0) >= platformLimit) return NextResponse.json({ error: "AI Studio временно занят. Попробуйте позднее." }, { status: 429 });

    const cost = aiCreditCost[input.data.intent];
    const { data: balance, error: balanceError } = await admin.rpc("refill_and_get_ai_credits", { p_tenant_id: context.tenantId, p_monthly_allotment: planMonthlyAiCredits[entitlement.plan] });
    if (balanceError) return NextResponse.json({ error: "Не удалось проверить баланс AI Studio." }, { status: 500 });
    if ((balance ?? 0) < cost) {
      return NextResponse.json({ error: "Токены AI Studio закончились до конца месяца.", topUpAvailable: isPolarConfigured() }, { status: 402 });
    }

    let output: unknown;
    let outputType: "text" | "image" = "text";
    let usage: unknown = {};
    let model: string | null = getAiStudioStatus().deployment;

    if (input.data.intent === "banner") {
      const result = await createAiStudioBanner(input.data.brief);
      const imageUrl = await storeBannerImage(admin, context.tenantId, result.image);
      output = { imageUrl };
      outputType = "image";
      model = getAiStudioBannerStatus().deployment;
    } else if (input.data.intent === "catalog_structure") {
      const result = await createAiStudioStructure(input.data.brief);
      output = result.structure;
      usage = result.usage ?? {};
    } else {
      const result = await createAiStudioDraft(input.data.intent, input.data.brief);
      output = result.draft;
      usage = result.usage ?? {};
    }

    const { error: spendError } = await admin.rpc("spend_ai_credits", { p_tenant_id: context.tenantId, p_cost: cost });
    if (spendError) console.error("[ai-studio] Failed to debit AI credits after a successful generation", { tenantId: context.tenantId, intent: input.data.intent, code: spendError.code });

    const saved = await admin.from("ai_studio_generations").insert({ tenant_id: context.tenantId, requested_by: context.user?.id ?? null, intent: input.data.intent, input_summary: input.data.brief, output: output as never, model, usage: usage as never, credit_cost: cost, output_type: outputType });
    if (saved.error) return NextResponse.json({ error: "Результат создан, но не удалось сохранить журнал." }, { status: 500 });

    if (outputType === "image") return NextResponse.json({ image: output });
    if (input.data.intent === "catalog_structure") return NextResponse.json({ structure: output });
    return NextResponse.json({ draft: output });
  } catch (error) {
    const status = error instanceof AzureFoundryError && error.status && error.status < 500 ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось создать результат AI Studio." }, { status });
  }
}
