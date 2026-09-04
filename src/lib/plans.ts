export type Plan = "basic" | "standard" | "pro";
export type PublicPlan = "basic" | "standard";

// `pro` remains only for legacy stores and has Brand capabilities.
export const publicPlans: PublicPlan[] = ["basic", "standard"];
export function isPublicPlan(value: unknown): value is PublicPlan { return typeof value === "string" && publicPlans.includes(value as PublicPlan); }
export const planRank: Record<Plan, number> = { basic: 0, standard: 1, pro: 1 };
export const planPrice: Record<Plan, number> = { basic: 24900, standard: 34900, pro: 34900 };
// Rounded annual offers approved for launch. They intentionally do not mirror a percentage calculation exactly.
export const planAnnualPrice: Record<Plan, number> = { basic: 239000, standard: 335000, pro: 335000 };
export const planAnnualSaving: Record<Plan, number> = { basic: 59800, standard: 83800, pro: 83800 };
export const planSetupPrice: Record<Plan, number> = { basic: 0, standard: 0, pro: 0 };
export const planFirstPayment: Record<Plan, number> = planPrice;
export const planName: Record<Plan, string> = { basic: "Старт", standard: "Бренд", pro: "Бренд" };
export function hasPlan(current: Plan, required: Plan) { return planRank[current] >= planRank[required]; }
// Draft engineering defaults, not a priced commitment: pending real Azure/Kimi-K2.6 and image-model
// cost reconciliation before the owner treats these numbers as final. AI Studio is now available on
// both tariffs; this monthly credit wallet (lazily refilled, see refill_and_get_ai_credits) is the
// differentiator instead of a hard Brand-only lock. Brand keeps its own exclusive depth separately:
// exact palette, custom domain, campaigns/brand-blocks and extended analytics (see planFeatures).
export const planMonthlyAiCredits: Record<Plan, number> = { basic: 30, standard: 120, pro: 120 };
export const planFeatures: Record<Plan, string[]> = {
  basic: ["Готовые шаблоны под нишу", "Подобранные цветовые палитры", "Логотип, каталог и заказы", "Адрес slug.dukenim.kz", "Постоянный футер Dukenim"],
  standard: ["Всё из тарифа «Старт»", "Точная палитра бренда", "Собственный домен", "Акции, кампании и бренд-блоки", "Расширенная аналитика витрины"],
  pro: ["Всё из тарифа «Старт»", "Точная палитра бренда", "Собственный домен", "Акции, кампании и бренд-блоки", "Расширенная аналитика витрины"],
};
