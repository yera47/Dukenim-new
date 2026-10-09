import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileOwner } from "@/lib/mobile-auth";
import { computeEntitlement } from "@/lib/entitlement";
import { hasPlan, planName, type Plan } from "@/lib/plans";

const tenantIdSchema = z.string().uuid();
const dateSchema = z.string().datetime({ offset: true }).nullable().optional();
const createSchema = z.object({
  tenantId: tenantIdSchema,
  title: z.string().trim().min(2).max(90),
  eyebrow: z.string().trim().max(40).optional().default(""),
  body: z.string().trim().max(300).optional().default(""),
  ctaLabel: z.string().trim().max(40).optional().default("Смотреть"),
  startsAt: dateSchema,
  endsAt: dateSchema,
}).strict();
const statusSchema = z.object({
  tenantId: tenantIdSchema,
  campaignId: z.string().uuid(),
  status: z.enum(["draft", "published", "archived"]),
  startsAt: dateSchema,
  endsAt: dateSchema,
}).strict();

type MobileOwner = NonNullable<Awaited<ReturnType<typeof getMobileOwner>>>;
type CampaignAccess =
  | { ok: false; response: NextResponse }
  | { ok: true; context: MobileOwner; plan: Plan; canManage: boolean };

async function campaignContext(request: Request, tenantId: string): Promise<CampaignAccess> {
  const context = await getMobileOwner(request, tenantId);
  if (!context) return { ok: false, response: NextResponse.json({ error: "Войдите как владелец магазина." }, { status: 401 }) };
  const tenant = await context.admin.from("tenants")
    .select("plan,next_plan,status,trial_ends_at")
    .eq("id", tenantId).maybeSingle();
  if (tenant.error || !tenant.data) return { ok: false, response: NextResponse.json({ error: "Не удалось загрузить магазин." }, { status: 503 }) };
  const entitlement = computeEntitlement(tenant.data);
  const plan = entitlement.plan as Plan;
  return { ok: true, context, plan, canManage: entitlement.active && hasPlan(plan, "standard") };
}

export async function GET(request: Request) {
  const tenantId = tenantIdSchema.safeParse(new URL(request.url).searchParams.get("tenantId"));
  if (!tenantId.success) return NextResponse.json({ error: "Магазин не найден." }, { status: 400 });
  const access = await campaignContext(request, tenantId.data);
  if (!access.ok) return access.response;
  const { context, plan, canManage } = access;
  if (!canManage) return NextResponse.json({ canManage: false, premiumRequired: false, planName: planName[plan], campaigns: [] }, { headers: { "Cache-Control": "private, no-store" } });
  const result = await context.admin.from("storefront_campaigns")
    .select("id,title,eyebrow,body,cta_label,status,image_url,starts_at,ends_at")
    .eq("tenant_id", tenantId.data).order("created_at", { ascending: false }).limit(100);
  if (result.error) return NextResponse.json({ error: "Не удалось загрузить акции." }, { status: 503 });
  return NextResponse.json({ canManage: true, premiumRequired: false, planName: planName[plan], campaigns: result.data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 4000) return NextResponse.json({ error: "Запрос слишком большой." }, { status: 413 });
  const input = createSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Проверьте название и текст акции." }, { status: 400 });
  const access = await campaignContext(request, input.data.tenantId);
  if (!access.ok) return access.response;
  if (!access.canManage) return NextResponse.json({ error: "Пробный период завершён. Посмотрите условия тарифа «Каталог»." }, { status: 403 });
  const { tenantId, title, eyebrow, body, ctaLabel, startsAt, endsAt } = input.data;
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return NextResponse.json({ error: "Дата окончания должна быть позже даты начала." }, { status: 400 });
  const result = await access.context.admin.from("storefront_campaigns").insert({
    tenant_id: tenantId, title, eyebrow: eyebrow || null, body: body || null,
    cta_label: ctaLabel || "Смотреть", cta_href: "#catalog", status: "draft", starts_at: startsAt ?? null, ends_at: endsAt ?? null,
  }).select("id,title,eyebrow,body,cta_label,status,image_url,starts_at,ends_at").single();
  if (result.error || !result.data) return NextResponse.json({ error: "Не удалось сохранить черновик акции." }, { status: 503 });
  return NextResponse.json({ campaign: result.data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 3000) return NextResponse.json({ error: "Запрос слишком большой." }, { status: 413 });
  const input = statusSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Проверьте статус акции." }, { status: 400 });
  const access = await campaignContext(request, input.data.tenantId);
  if (!access.ok) return access.response;
  if (!access.canManage) return NextResponse.json({ error: "Пробный период завершён. Посмотрите условия тарифа «Каталог»." }, { status: 403 });
  if (input.data.startsAt && input.data.endsAt && new Date(input.data.endsAt) <= new Date(input.data.startsAt)) return NextResponse.json({ error: "Дата окончания должна быть позже даты начала." }, { status: 400 });
  const result = await access.context.admin.from("storefront_campaigns")
    .update({ status: input.data.status, ...(input.data.startsAt !== undefined ? { starts_at: input.data.startsAt } : {}), ...(input.data.endsAt !== undefined ? { ends_at: input.data.endsAt } : {}), updated_at: new Date().toISOString() })
    .eq("tenant_id", input.data.tenantId).eq("id", input.data.campaignId)
    .select("id,status").maybeSingle();
  if (result.error || !result.data) return NextResponse.json({ error: "Акция не найдена или не обновлена." }, { status: result.error ? 503 : 404 });
  return NextResponse.json({ campaign: result.data }, { headers: { "Cache-Control": "private, no-store" } });
}
