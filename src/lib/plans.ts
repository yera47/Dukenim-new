export type Plan = "basic" | "standard" | "pro";
export type PublicPlan = "basic";

// These values remain in storage for historical tenant rows; the public offer is one plan.
export const publicPlans: PublicPlan[] = ["basic"];
export function isPublicPlan(value: unknown): value is Plan { return value === "basic" || value === "standard" || value === "pro"; }
export const planRank: Record<Plan, number> = { basic: 1, standard: 1, pro: 1 };
export const planPrice: Record<Plan, number> = { basic: 24_900, standard: 24_900, pro: 24_900 };
// Annual billing is not a public offer under the owner-approved single monthly plan.
export const planAnnualPrice: Record<Plan, number> = { basic: 298_800, standard: 298_800, pro: 298_800 };
export const planAnnualSaving: Record<Plan, number> = { basic: 0, standard: 0, pro: 0 };
export const planSetupPrice: Record<Plan, number> = { basic: 0, standard: 0, pro: 0 };
export const planFirstPayment: Record<Plan, number> = planPrice;
export const planName: Record<Plan, string> = { basic: "Каталог", standard: "Каталог", pro: "Каталог" };
// Plan columns stay for compatibility with historical tenant rows, but no longer gate product features.
export function hasPlan(_current: Plan, _required: Plan) { void _current; void _required; return true; }
export const planFeatures: Record<Plan, string[]> = {
  basic: ["Каталог, оформление заказов и публичная витрина", "Товары, варианты, цены, скидки и остатки", "Самовывоз, доставка и подключаемые способы оплаты", "AI-помощник и сезонные кампании (при доступности сервиса)", "Команда, аналитика, интеграции и выездные продажи"],
  standard: ["Все функции тарифа «Каталог»"],
  pro: ["Все функции тарифа «Каталог»"],
};
