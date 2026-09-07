import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth";
import { aiStudioDesignSchema } from "@/lib/ai/studio-schemas";
import { tenantEntitlement } from "@/lib/plan-access";
import { hasPlan, type Plan } from "@/lib/plans";
import { getStorefrontSettings, saveStorefrontSettings } from "@/lib/queries/owner";
import { templateCatalog } from "@/lib/storefront-theme";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({ generationId: z.string().uuid() });

export async function POST(request: Request) {
  const context = await getSessionContext();
  if (!context?.user) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  if (!context.tenantId || !["owner", "superadmin"].includes(context.role)) return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Выберите сохранённое предложение AI." }, { status: 400 });
  const entitlement = await tenantEntitlement(context.tenantId);
  if (!entitlement.active) return NextResponse.json({ error: "Для сохранения нужен активный пробный период или подписка." }, { status: 403 });

  // The session client keeps RLS active; explicit tenant and intent filters make
  // the ownership boundary visible and testable as well.
  const client = await createClient();
  const generation = await client
    .from("ai_studio_generations")
    .select("id,output")
    .eq("id", input.data.generationId)
    .eq("tenant_id", context.tenantId)
    .eq("intent", "store_design")
    .maybeSingle();
  if (generation.error || !generation.data) return NextResponse.json({ error: "Предложение не найдено в вашем магазине." }, { status: 404 });

  const design = aiStudioDesignSchema.safeParse(generation.data.output);
  if (!design.success) return NextResponse.json({ error: "Оформление нужно сгенерировать заново." }, { status: 422 });
  const template = templateCatalog.find((item) => item.key === design.data.templateKey);
  if (!template || !hasPlan(entitlement.plan, template.minPlan as Plan)) return NextResponse.json({ error: "Этот шаблон недоступен на текущем тарифе." }, { status: 403 });

  const current = await getStorefrontSettings(client, context.tenantId);
  if (current.error) return NextResponse.json({ error: "Не удалось прочитать текущее оформление." }, { status: 500 });
  const saved = await saveStorefrontSettings(client, context.tenantId, {
    template_key: design.data.templateKey,
    palette_key: design.data.paletteKey,
    brand_color: current.data?.brand_color ?? null,
    hero_title: design.data.heroTitle,
    hero_subtitle: design.data.heroSubtitle,
    hero_image_url: current.data?.hero_image_url ?? null,
    hero_cta_label: design.data.heroCtaLabel,
  });
  if (saved.error) return NextResponse.json({ error: "Не удалось применить оформление. Повторите попытку." }, { status: 500 });

  revalidatePath("/admin/ai-studio");
  revalidatePath("/admin/settings");
  revalidatePath("/s/[slug]", "page");
  return NextResponse.json({ saved: true });
}
