import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { ProductImageInProgressError, ProductImageProviderError } from "@/lib/ai/product-image-provider";
import { ProductPhotoPackCostError } from "@/lib/ai/product-photo-generation";
import { getProductPhotoServerStatus, runProductPhotoGeneration } from "@/lib/ai/product-photo-server";
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
  const status = await getProductPhotoServerStatus(tenantId);
  return NextResponse.json({ enabled: status.enabled, provider: status.enabled ? "azure-ai-foundry" : null,
    configuration: { azureReady: status.azureReady, creditLedgerReady: status.creditLedgerReady, generationRouteReady: status.enabled }, reason: status.reason });
}

export async function POST(request: Request) {
  const context = await requireRole(["owner", "superadmin"]);
  const { tenantId } = context;
  if (tenantId && !await tenantHasPlan(tenantId, "standard")) return NextResponse.json({ error: "AI-фотостудия доступна на тарифе Premium." }, { status: 403 });
  if (!tenantId || !context.user?.id) return NextResponse.json({ error: "Магазин не выбран." }, { status: 400 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_REQUEST_BYTES) return NextResponse.json({ error: "Запрос слишком большой." }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Не удалось прочитать форму." }, { status: 400 }); }
  if (form.has("tenantId") || form.has("sourceObjectPath") || form.has("referenceIds")) return NextResponse.json({ error: "Магазин и ссылки на хранилище определяются сервером." }, { status: 400 });

  const sources = form.getAll("source");
  const source = sources.length === 1 && sources[0] instanceof File ? sources[0] : null;
  const rawReferences = form.getAll("references");
  const references = rawReferences.filter((value): value is File => value instanceof File);
  if (!source || !validImage(source)) return NextResponse.json({ error: "Нужен один JPG, PNG или WebP до 10 МБ." }, { status: 400 });
  if (rawReferences.length !== references.length || references.length > 6 || references.some(file => !validImage(file))) return NextResponse.json({ error: "Дополнительные референсы должны быть JPG, PNG или WebP до 10 МБ; максимум 6 файлов." }, { status: 400 });
  if (source.size + references.reduce((sum, file) => sum + file.size, 0) > MAX_REQUEST_BYTES) return NextResponse.json({ error: "Суммарный размер изображений превышает 65 МБ." }, { status: 413 });
  const parsed = fieldsSchema.safeParse({ scenario: form.get("scenario"), mode: form.get("mode"), outputCount: form.get("outputCount"), instruction: form.get("instruction"), merchantFacts: form.get("merchantFacts") ?? "", idempotencyKey: form.get("idempotencyKey"), merchantApproved: form.get("merchantApproved") });
  if (!parsed.success) return NextResponse.json({ error: "Проверьте параметры генерации.", details: parsed.error.issues.map(issue => issue.message) }, { status: 400 });
  const validation = validateProductPhotoDraft({ scenario: parsed.data.scenario, mode: parsed.data.mode, outputCount: parsed.data.outputCount as 2 | 3 | 4 | 5, instruction: parsed.data.instruction, sourceCount: 1, additionalReferenceCount: references.length, merchantFacts: parsed.data.merchantFacts });
  if (!validation.ok) return NextResponse.json({ error: validation.errors[0], details: validation.errors }, { status: 400 });

  const sourceBytes = new Uint8Array(await source.arrayBuffer());
  const metadata = await sharp(sourceBytes, { limitInputPixels: 40_000_000 }).metadata().catch(() => null);
  if (!metadata?.width || !metadata.height) return NextResponse.json({ error: "Не удалось прочитать размеры исходного изображения." }, { status: 400 });
  const referenceBytes = await Promise.all(references.map(async file => {
    const image = new Uint8Array(await file.arrayBuffer());
    const referenceMetadata = await sharp(image, { limitInputPixels: 40_000_000 }).metadata().catch(() => null);
    if (!referenceMetadata?.width || !referenceMetadata.height) throw new Error("invalid-reference-image");
    return { kind: "product" as const, image };
  })).catch(() => null);
  if (!referenceBytes) return NextResponse.json({ error: "Один из референсов не является корректным изображением." }, { status: 400 });
  try {
    const result = await runProductPhotoGeneration({ tenantId, actorId: context.user.id, idempotencyKey: parsed.data.idempotencyKey, sourceImage: sourceBytes, references: referenceBytes,
      instruction: [parsed.data.instruction, parsed.data.merchantFacts.trim()].filter(Boolean).join("\nПроверенные факты магазина: "), merchantApproved: true,
      outputCount: parsed.data.outputCount as 2 | 3 | 4 | 5, resolution: process.env.AI_PRODUCT_PHOTO_RESOLUTION ?? "1MP", referenceMegapixels: Number(((metadata.width * metadata.height) / 1_000_000).toFixed(2)) });
    return NextResponse.json({ reservationId: result.reservationId, outputs: result.outputs.map(output => ({ imageUrl: output.imageUrl, model: output.model, provenance: output.provenance })), failedOutputs: result.failedOutputs, cached: result.cached }, { status: result.cached ? 200 : 201 });
  } catch (error) {
    if (error instanceof ProductImageInProgressError) return NextResponse.json({ error: "Генерация с этим ключом уже выполняется.", retryable: true }, { status: 409 });
    if (error instanceof ProductPhotoPackCostError) return NextResponse.json({ error: "Стоимость генерации не подтверждена или превышает серверный лимит.", retryable: false }, { status: 503 });
    if (error instanceof ProductImageProviderError) return NextResponse.json({ error: "Azure не завершил генерацию. Резерв сохранён для безопасной сверки.", retryable: false }, { status: 502 });
    return NextResponse.json({ error: "AI-фото временно недоступно.", retryable: false }, { status: 503 });
  }
}
