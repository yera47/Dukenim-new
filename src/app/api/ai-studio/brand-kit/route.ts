import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prepareBrandKitPlan, validateBrandKitProfile, type BrandKitProfile } from "@/lib/ai/brand-kit";
import { tenantHasPlan } from "@/lib/plan-access";

const ratio = z.enum(["16:9", "4:3", "1:1", "9:16", "3:4"]);
const profileInput = z.object({
  revision: z.number().int().positive(),
  palette: z.object({
    background: z.string().regex(/^#[0-9a-f]{6}$/i),
    surface: z.string().regex(/^#[0-9a-f]{6}$/i),
    accent: z.string().regex(/^#[0-9a-f]{6}$/i),
    ink: z.string().regex(/^#[0-9a-f]{6}$/i),
  }).strict(),
  vertical: z.enum(["fashion", "beauty", "food", "flowers", "services", "event", "home", "other"]),
  categories: z.array(z.object({ id: z.string().regex(/^[a-z0-9][a-z0-9:_-]{2,160}$/i), name: z.string().trim().min(2).max(60) }).strict()).min(1).max(12),
  selectedStyle: z.enum(["clay-3d", "editorial-photo", "soft-collage"]),
  layoutRatios: z.object({ hero: ratio, category: ratio, story: ratio }).strict(),
}).strict();

export async function GET() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  if (!tenantId || !await tenantHasPlan(tenantId, "standard")) return NextResponse.json({ error: "Пробный период завершён. Подключите тариф «Каталог»." }, { status: 403 });
  return NextResponse.json({ enabled: false, promptVersion: "brand-kit-v1", provider: null, reason: "Провайдер изображений и бюджет пока не подключены." });
}

export async function POST(request: Request) {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  if (tenantId && !await tenantHasPlan(tenantId, "standard")) return NextResponse.json({ error: "Пробный период завершён. Подключите тариф «Каталог»." }, { status: 403 });
  if (!tenantId) return NextResponse.json({ error: "Магазин не выбран." }, { status: 400 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > 32_000) return NextResponse.json({ error: "Запрос слишком большой." }, { status: 413 });
  const raw = await request.json().catch(() => null);
  const parsed = profileInput.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Некорректный профиль Brand Kit.", details: parsed.error.issues.map(issue => issue.message) }, { status: 400 });

  // Tenant and all asset references are server-owned. Client input cannot bind a
  // different tenant or claim an unverified logo/product/packaging reference.
  const profile: BrandKitProfile = {
    ...parsed.data,
    tenantId,
    logoReferenceId: null,
    packagingReferenceIds: [],
    productReferenceIds: [],
  };
  const validation = validateBrandKitProfile(profile);
  if (!validation.ok) return NextResponse.json({ error: validation.errors[0], details: validation.errors }, { status: 400 });
  const plan = prepareBrandKitPlan(profile, { remainingOutputs: 0, budgetCapMicros: 0, estimatedMicrosPerOutput: null });
  return NextResponse.json({ enabled: false, plan, referencesVerified: false, reason: "План подготовлен локально. Генерация не запускалась, бюджет не списан." }, { status: 503 });
}
