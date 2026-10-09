import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { validateProductPhotoDraft } from "@/lib/ai/product-photo-workflow";
import { tenantHasPlan } from "@/lib/plan-access";

const MAX_IMAGE_BYTES = 10_000_000;
const MAX_REQUEST_BYTES = 65_000_000;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const fieldsSchema = z.object({
  scenario: z.enum(["product_photos", "catalog_hero", "story_promo"]),
  mode: z.enum(["background_composite", "creative_angles"]),
  outputCount: z.coerce.number().int().min(2).max(5),
  instruction: z.string().trim().min(8).max(500),
  merchantFacts: z.string().max(800),
  idempotencyKey: z.string().uuid(),
  merchantApproved: z.literal("true"),
});

function validImage(file: File) {
  return file.size > 0 && file.size <= MAX_IMAGE_BYTES && acceptedTypes.has(file.type);
}

export async function GET() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  if (!tenantId || !await tenantHasPlan(tenantId, "standard")) return NextResponse.json({ error: "AI-фотостудия доступна на тарифе Premium." }, { status: 403 });
  return NextResponse.json({ enabled: false, provider: null, reason: "Live image provider and cost budget are not configured." });
}

export async function POST(request: Request) {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  if (tenantId && !await tenantHasPlan(tenantId, "standard")) return NextResponse.json({ error: "AI-фотостудия доступна на тарифе Premium." }, { status: 403 });
  if (!tenantId) return NextResponse.json({ error: "Магазин не выбран." }, { status: 400 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_REQUEST_BYTES) return NextResponse.json({ error: "Запрос слишком большой." }, { status: 413 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Некорректные данные формы." }, { status: 400 });
  }
  if (form.has("tenantId") || form.has("sourceObjectPath") || form.has("referenceIds")) return NextResponse.json({ error: "Магазин и ссылки на оригиналы определяются сервером." }, { status: 400 });

  const sources = form.getAll("source");
  const source = sources.length === 1 && sources[0] instanceof File ? sources[0] : null;
  const rawReferences = form.getAll("references");
  const references = rawReferences.filter((value): value is File => value instanceof File);
  if (!source || !validImage(source)) return NextResponse.json({ error: "Нужен один JPG, PNG или WebP до 10 МБ." }, { status: 400 });
  if (rawReferences.length !== references.length || references.length > 6 || references.some(file => !validImage(file))) return NextResponse.json({ error: "Дополнительные оригиналы должны быть JPG, PNG или WebP до 10 МБ; максимум 6 файлов." }, { status: 400 });

  const parsed = fieldsSchema.safeParse({
    scenario: form.get("scenario"),
    mode: form.get("mode"),
    outputCount: form.get("outputCount"),
    instruction: form.get("instruction"),
    merchantFacts: form.get("merchantFacts") ?? "",
    idempotencyKey: form.get("idempotencyKey"),
    merchantApproved: form.get("merchantApproved"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Некорректные параметры генерации.", details: parsed.error.issues.map(issue => issue.message) }, { status: 400 });

  const validation = validateProductPhotoDraft({
    scenario: parsed.data.scenario,
    mode: parsed.data.mode,
    outputCount: parsed.data.outputCount as 2 | 3 | 4 | 5,
    instruction: parsed.data.instruction,
    sourceCount: 1,
    additionalReferenceCount: references.length,
    merchantFacts: parsed.data.merchantFacts,
  });
  if (!validation.ok) return NextResponse.json({ error: validation.errors[0], details: validation.errors }, { status: 400 });
  return NextResponse.json({ error: "Live-генерация недоступна: провайдер и бюджет не подключены.", retryable: false }, { status: 503 });
}
