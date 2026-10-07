import type { BusinessVertical } from "@/types/database";

export const BRAND_KIT_PROMPT_VERSION = "brand-kit-v1" as const;
export const BRAND_KIT_MAX_REGENERATIONS_PER_ASSET = 3;

export type BrandKitStyle = "clay-3d" | "editorial-photo" | "soft-collage";
export type BrandKitAssetKind = "hero" | "category" | "story";
export type BrandKitRatio = "16:9" | "4:3" | "1:1" | "9:16" | "3:4";

export type BrandKitProfile = {
  tenantId: string;
  revision: number;
  palette: { background: string; surface: string; accent: string; ink: string };
  logoReferenceId: string | null;
  vertical: BusinessVertical;
  categories: Array<{ id: string; name: string }>;
  packagingReferenceIds: string[];
  productReferenceIds: string[];
  selectedStyle: BrandKitStyle;
  layoutRatios: { hero: BrandKitRatio; category: BrandKitRatio; story: BrandKitRatio };
};

export type BrandKitTarget = { kind: BrandKitAssetKind; id: string; label: string; ratio: BrandKitRatio; decorative: boolean };
export type BrandKitPlan = {
  promptVersion: typeof BRAND_KIT_PROMPT_VERSION;
  profileFingerprint: string;
  targets: BrandKitTarget[];
  estimatedOutputs: number;
  estimatedAmountMicros: number | null;
  withinQuota: boolean;
  withinBudget: boolean;
  warnings: string[];
};

const hex = /^#[0-9a-f]{6}$/i;
const reference = /^[a-z0-9][a-z0-9:_-]{2,160}$/i;
const ratios = new Set<BrandKitRatio>(["16:9", "4:3", "1:1", "9:16", "3:4"]);
const styles = new Set<BrandKitStyle>(["clay-3d", "editorial-photo", "soft-collage"]);

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function fingerprint(value: unknown) {
  const source = stable(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `bk1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function normalizedBrandKitProfile(profile: BrandKitProfile): BrandKitProfile {
  return {
    ...profile,
    palette: Object.fromEntries(Object.entries(profile.palette).map(([key, value]) => [key, value.toLowerCase()])) as BrandKitProfile["palette"],
    categories: [...profile.categories].map(item => ({ ...item, name: item.name.trim() })).sort((a, b) => a.id.localeCompare(b.id)),
    packagingReferenceIds: [...new Set(profile.packagingReferenceIds)].sort(),
    productReferenceIds: [...new Set(profile.productReferenceIds)].sort(),
  };
}

export function validateBrandKitProfile(profile: BrandKitProfile) {
  const errors: string[] = [];
  if (!profile || typeof profile !== "object") return { ok: false, errors: ["Некорректный профиль бренда."] };
  if (typeof profile.tenantId !== "string" || !profile.tenantId.trim()) errors.push("Профиль должен быть привязан к магазину.");
  if (!Number.isInteger(profile.revision) || profile.revision < 1) errors.push("Некорректная ревизия профиля.");
  if (!profile.palette || typeof profile.palette !== "object" || Object.keys(profile.palette).sort().join(",") !== "accent,background,ink,surface" || Object.values(profile.palette).some(value => typeof value !== "string" || !hex.test(value))) errors.push("Все четыре цвета должны быть заданы в формате HEX.");
  if (profile.logoReferenceId && (typeof profile.logoReferenceId !== "string" || !reference.test(profile.logoReferenceId) || profile.logoReferenceId.startsWith("generated:"))) errors.push("Некорректная ссылка на оригинал логотипа.");
  if (!Array.isArray(profile.categories) || profile.categories.length < 1 || profile.categories.length > 12) errors.push("Нужно от 1 до 12 категорий.");
  else if (profile.categories.some(item => !item || typeof item.id !== "string" || typeof item.name !== "string" || !reference.test(item.id) || item.name.trim().length < 2 || item.name.length > 60)) errors.push("Проверьте названия и идентификаторы категорий.");
  if (!Array.isArray(profile.packagingReferenceIds) || !Array.isArray(profile.productReferenceIds) || [...(profile.packagingReferenceIds ?? []), ...(profile.productReferenceIds ?? [])].some(id => typeof id !== "string" || !reference.test(id) || id.startsWith("generated:"))) errors.push("Некорректная ссылка на оригинал.");
  if (!styles.has(profile.selectedStyle)) errors.push("Некорректный стиль Brand Kit.");
  if (!profile.layoutRatios || !ratios.has(profile.layoutRatios.hero) || !ratios.has(profile.layoutRatios.category) || !ratios.has(profile.layoutRatios.story)) errors.push("Некорректные пропорции макетов.");
  return { ok: errors.length === 0, errors };
}

export function brandKitProfileFingerprint(profile: BrandKitProfile) {
  return fingerprint(normalizedBrandKitProfile(profile));
}

export function buildBrandKitTargets(profile: BrandKitProfile): BrandKitTarget[] {
  const hasPackaging = profile.packagingReferenceIds.length > 0;
  return [
    { kind: "hero", id: "hero", label: "Главный экран", ratio: profile.layoutRatios.hero, decorative: !hasPackaging },
    ...profile.categories.map(item => ({ kind: "category" as const, id: `category:${item.id}`, label: item.name, ratio: profile.layoutRatios.category, decorative: !hasPackaging })),
    ...[1, 2, 3].map(index => ({ kind: "story" as const, id: `story:${index}`, label: `История ${index}`, ratio: profile.layoutRatios.story, decorative: !hasPackaging })),
  ];
}

export function buildBrandKitPrompt(profile: BrandKitProfile, target: BrandKitTarget) {
  const normalized = normalizedBrandKitProfile(profile);
  const validation = validateBrandKitProfile(normalized);
  if (!validation.ok) throw new Error(validation.errors[0]);
  const inputs = { version: BRAND_KIT_PROMPT_VERSION, profileFingerprint: brandKitProfileFingerprint(normalized), target, vertical: normalized.vertical, palette: normalized.palette, style: normalized.selectedStyle, categories: normalized.categories, logoReferenceId: normalized.logoReferenceId, packagingReferenceIds: normalized.packagingReferenceIds, productReferenceIds: normalized.productReferenceIds };
  const prompt = [
    `Система оформления ${BRAND_KIT_PROMPT_VERSION}.`,
    `Создай ${target.label} (${target.kind}, ${target.ratio}) в стиле ${normalized.selectedStyle}.`,
    `Палитра: фон ${normalized.palette.background}, поверхность ${normalized.palette.surface}, акцент ${normalized.palette.accent}, текст ${normalized.palette.ink}.`,
    `Вертикаль: ${normalized.vertical}. Категории: ${normalized.categories.map(item => item.name).join(", ")}.`,
    normalized.logoReferenceId ? "Логотип — только оригинал отдельным слоем; не перерисовывай буквы." : "Логотип не предоставлен: не придумывай товарный знак или надпись.",
    normalized.packagingReferenceIds.length ? "Фирменную упаковку воспроизводи только по оригинальным референсам." : "Оригиналы упаковки не предоставлены: изображение декоративное, без выдуманной реальной упаковки.",
    "Сохрани форму продукта, свет, материалы и цветовые признаки. Не добавляй цены, акции, состав или наличие.",
  ].join(" ");
  return { prompt, inputs, idempotencyKey: fingerprint(inputs) };
}

export function prepareBrandKitPlan(profile: BrandKitProfile, input: { remainingOutputs: number; budgetCapMicros: number; estimatedMicrosPerOutput: number | null }): BrandKitPlan {
  const targets = buildBrandKitTargets(profile);
  const estimatedOutputs = targets.length;
  const quotaIsKnown = Number.isInteger(input.remainingOutputs) && input.remainingOutputs >= 0;
  const budgetIsKnown = Number.isSafeInteger(input.budgetCapMicros) && input.budgetCapMicros >= 0 && input.estimatedMicrosPerOutput !== null && Number.isSafeInteger(input.estimatedMicrosPerOutput) && input.estimatedMicrosPerOutput > 0;
  const estimatedAmountMicros = budgetIsKnown ? estimatedOutputs * input.estimatedMicrosPerOutput! : null;
  const warnings: string[] = [];
  if (profile.packagingReferenceIds.length === 0) warnings.push("Нет оригиналов упаковки: изображения будут помечены как декоративные.");
  if (!profile.logoReferenceId) warnings.push("Логотип не приложен: система не будет придумывать знак или надпись.");
  return { promptVersion: BRAND_KIT_PROMPT_VERSION, profileFingerprint: brandKitProfileFingerprint(profile), targets, estimatedOutputs, estimatedAmountMicros, withinQuota: quotaIsKnown && estimatedOutputs <= input.remainingOutputs, withinBudget: estimatedAmountMicros !== null && estimatedAmountMicros <= input.budgetCapMicros, warnings };
}

export function brandKitDraftInvalidation(previous: BrandKitProfile, next: BrandKitProfile) {
  if (brandKitProfileFingerprint(previous) === brandKitProfileFingerprint(next)) return { stale: false, reason: null };
  const reasons: string[] = [];
  if (previous.revision !== next.revision) reasons.push("ревизия профиля");
  if (stable(previous.palette) !== stable(next.palette)) reasons.push("цвета");
  if (previous.logoReferenceId !== next.logoReferenceId) reasons.push("логотип");
  if (stable(previous.categories) !== stable(next.categories)) reasons.push("категории");
  if (stable(previous.layoutRatios) !== stable(next.layoutRatios)) reasons.push("форматы");
  if (previous.selectedStyle !== next.selectedStyle) reasons.push("стиль");
  if (stable(previous.packagingReferenceIds) !== stable(next.packagingReferenceIds) || stable(previous.productReferenceIds) !== stable(next.productReferenceIds)) reasons.push("оригиналы");
  return { stale: true, reason: `Черновик устарел: изменились ${reasons.join(", ") || "параметры бренда"}. Создайте комплект заново перед применением.` };
}

export function brandKitRegenerationKey(profile: BrandKitProfile, target: BrandKitTarget, attempt: number) {
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > BRAND_KIT_MAX_REGENERATIONS_PER_ASSET) throw new Error("Превышен лимит повторов для одного элемента.");
  return fingerprint({ base: buildBrandKitPrompt(profile, target).idempotencyKey, attempt });
}

export function canApplyBrandKitDraft(input: { profile: BrandKitProfile; draftFingerprint: string; targetIds: string[]; acceptedTargetIds: string[]; explicitApproval: boolean }) {
  const expected = buildBrandKitTargets(input.profile).map(item => item.id).sort();
  const targets = [...new Set(input.targetIds)].sort();
  const accepted = new Set(input.acceptedTargetIds);
  return input.explicitApproval && input.draftFingerprint === brandKitProfileFingerprint(input.profile) && targets.length === input.targetIds.length && targets.length === expected.length && targets.every((id, index) => id === expected[index] && accepted.has(id));
}
