import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth";
import { aiStudioDraftSchema } from "@/lib/ai/studio-schemas";
import { tenantEntitlement } from "@/lib/plan-access";
import { hasPlan } from "@/lib/plans";
import { getStorefrontSettings, saveStorefrontSettings } from "@/lib/queries/owner";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({ generationId: z.string().uuid() });

export async function POST(request: Request) {
  const context = await getSessionContext();
  if (!context?.user) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  if (!context.tenantId || !["owner", "superadmin"].includes(context.role)) return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Выберите сохранённый текст AI." }, { status: 400 });
  const entitlement = await tenantEntitlement(context.tenantId);
  if (!entitlement.active) return NextResponse.json({ error: "Для сохранения нужен активный пробный период или подписка." }, { status: 403 });

  const client = await createClient();
  const generation = await client
    .from("ai_studio_generations")
    .select("id,intent,output")
    .eq("id", input.data.generationId)
    .eq("tenant_id", context.tenantId)
    .in("intent", ["hero", "promotion"])
    .maybeSingle();
  if (generation.error || !generation.data) return NextResponse.json({ error: "Текст не найден в вашем магазине." }, { status: 404 });
  const draft = aiStudioDraftSchema.safeParse(generation.data.output);
  if (!draft.success) return NextResponse.json({ error: "Текст нужно сгенерировать заново." }, { status: 422 });

  if (generation.data.intent === "promotion") {
    if (!hasPlan(entitlement.plan, "standard")) return NextResponse.json({ error: "Кампании доступны на тарифе «Бренд»." }, { status: 403 });
    const existing = await client.from("storefront_campaigns").select("id").eq("tenant_id", context.tenantId).eq("ai_generation_id", generation.data.id).maybeSingle();
    if (existing.data) return NextResponse.json({ saved: true, target: "campaign", campaignId: existing.data.id, existing: true });
    const created = await client.from("storefront_campaigns").insert({
      tenant_id: context.tenantId, title: draft.data.title, eyebrow: draft.data.eyebrow || null,
      body: draft.data.body, cta_label: draft.data.ctaLabel, cta_href: "#catalog",
      image_url: null, ai_generation_id: generation.data.id, status: "draft",
    }).select("id").single();
    if (created.error || !created.data) {
      const duplicate = await client.from("storefront_campaigns").select("id").eq("tenant_id", context.tenantId).eq("ai_generation_id", generation.data.id).maybeSingle();
      if (duplicate.data) return NextResponse.json({ saved: true, target: "campaign", campaignId: duplicate.data.id, existing: true });
      return NextResponse.json({ error: "Не удалось сохранить черновик кампании." }, { status: 500 });
    }
    revalidatePath("/admin/settings");
    return NextResponse.json({ saved: true, target: "campaign", campaignId: created.data.id, existing: false });
  }

  const current = await getStorefrontSettings(client, context.tenantId);
  if (current.error) return NextResponse.json({ error: "Не удалось прочитать текущее оформление." }, { status: 500 });
  const saved = await saveStorefrontSettings(client, context.tenantId, {
    template_key: current.data?.template_key ?? "atelier",
    palette_key: current.data?.palette_key ?? "ink-brass",
    brand_color: current.data?.brand_color ?? null,
    hero_title: draft.data.title,
    hero_subtitle: draft.data.body,
    hero_image_url: current.data?.hero_image_url ?? null,
    hero_cta_label: draft.data.ctaLabel,
  });
  if (saved.error) return NextResponse.json({ error: "Не удалось применить текст. Повторите попытку." }, { status: 500 });
  revalidatePath("/admin/settings");
  revalidatePath("/s/[slug]", "page");
  return NextResponse.json({ saved: true, target: "storefront" });
}
