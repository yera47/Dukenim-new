export type Plan = "basic" | "standard" | "pro";
export type PublicPlan = "basic" | "standard";

// `pro` remains only for legacy stores and has the same rank as Premium.
export const publicPlans: PublicPlan[] = ["basic", "standard"];
export function isPublicPlan(value: unknown): value is PublicPlan { return typeof value === "string" && publicPlans.includes(value as PublicPlan); }
export const planRank: Record<Plan, number> = { basic: 1, standard: 2, pro: 2 };
export const planPrice: Record<Plan, number> = { basic: 25_000, standard: 35_000, pro: 35_000 };
// Monthly billing is confirmed. Annual prices remain legacy-only and are not a public offer.
export const planAnnualPrice: Record<Plan, number> = { basic: 239_000, standard: 335_000, pro: 335_000 };
export const planAnnualSaving: Record<Plan, number> = { basic: 59_800, standard: 83_800, pro: 83_800 };
export const planSetupPrice: Record<Plan, number> = { basic: 0, standard: 0, pro: 0 };
export const planFirstPayment: Record<Plan, number> = planPrice;
export const planName: Record<Plan, string> = { basic: "Base", standard: "Premium", pro: "Premium (legacy)" };
export function hasPlan(current: Plan, required: Plan) { return planRank[current] >= planRank[required]; }
export const planFeatures: Record<Plan, string[]> = {
  basic: ["Каталог, корзина и оформление заказа", "Варианты, остатки, скидки и карточки товаров", "Самовывоз, доставка и способы оплаты", "Постоянная ссылка на магазин", "Без AI-генерации"],
  standard: ["Всё из Base", "AI-инструменты для оформления товаров", "Product credits с прозрачным балансом", "Дополнительные кредиты после запуска оплаты", "Расширенная аналитика после отдельного запуска", "Приоритетная поддержка"],
  pro: ["Возможности Premium", "AI-инструменты для оформления товаров", "Расширенная аналитика после отдельного запуска"],
};
