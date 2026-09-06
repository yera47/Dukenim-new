import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth";
import { tenantHasPlan } from "@/lib/plan-access";
import { createAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({ generationId: z.string().uuid() });
const outputSchema = z.object({ imageUrl: z.string().url().refine((value) => value.startsWith("https://")) });

export async function POST(request: Request) {
  const context = await getSessionContext();
  if (!context?.user) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  if (!context.tenantId || !["owner", "superadmin"].includes(context.role)) return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  if (!await tenantHasPlan(context.tenantId, "standard")) return NextResponse.json({ error: "Кампании доступны на тарифе «Бренд»." }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Баннер не найден." }, { status: 400 });

  const admin = createAdminClient();
  const generation = await admin.from("ai_studio_generations").select("id,input_summary,output").eq("id", parsed.data.generationId).eq("tenant_id", context.tenantId).eq("intent", "banner").maybeSingle();
  if (generation.error || !generation.data) return NextResponse.json({ error: "Баннер не найден в журнале AI Studio." }, { status: 404 });
  const output = outputSchema.safeParse(generation.data.output);
  if (!output.success) return NextResponse.json({ error: "У баннера нет безопасного изображения." }, { status: 400 });

  const existing = await admin.from("storefront_campaigns").select("id").eq("tenant_id", context.tenantId).eq("ai_generation_id", generation.data.id).maybeSingle();
  if (existing.data) return NextResponse.json({ campaignId: existing.data.id, existing: true });

  const title = generation.data.input_summary.trim().slice(0, 90) || "Новая кампания";
  const created = await admin.from("storefront_campaigns").insert({ tenant_id: context.tenantId, title, eyebrow: "AI Studio", body: "Проверьте текст и изображение перед публикацией.", cta_label: "Смотреть каталог", cta_href: "#catalog", image_url: output.data.imageUrl, ai_generation_id: generation.data.id, status: "draft" }).select("id").single();
  if (created.error || !created.data) {
    const duplicate = await admin.from("storefront_campaigns").select("id").eq("tenant_id", context.tenantId).eq("ai_generation_id", generation.data.id).maybeSingle();
    if (duplicate.data) return NextResponse.json({ campaignId: duplicate.data.id, existing: true });
    return NextResponse.json({ error: "Не удалось создать черновик кампании." }, { status: 500 });
  }
  return NextResponse.json({ campaignId: created.data.id, existing: false });
}
