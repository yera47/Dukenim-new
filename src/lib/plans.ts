export type Plan = "basic" | "standard" | "pro";
export type PublicPlan = "basic" | "standard";

// `pro` remains only for legacy stores and has Brand capabilities.
export const publicPlans: PublicPlan[] = ["basic"];
export function isPublicPlan(value: unknown): value is PublicPlan { return typeof value === "string" && publicPlans.includes(value as PublicPlan); }
export const planRank: Record<Plan, number> = { basic: 1, standard: 1, pro: 1 };
export const planPrice: Record<Plan, number> = { basic: 24900, standard: 24900, pro: 24900 };
// Rounded annual offers approved for launch. They intentionally do not mirror a percentage calculation exactly.
export const planAnnualPrice: Record<Plan, number> = { basic: 239000, standard: 335000, pro: 335000 };
export const planAnnualSaving: Record<Plan, number> = { basic: 59800, standard: 83800, pro: 83800 };
export const planSetupPrice: Record<Plan, number> = { basic: 0, standard: 0, pro: 0 };
export const planFirstPayment: Record<Plan, number> = planPrice;
export const planName: Record<Plan, string> = { basic: "Каталог", standard: "Каталог", pro: "Каталог" };
export function hasPlan(current: Plan, required: Plan) { return planRank[current] >= planRank[required]; }
export const planFeatures: Record<Plan, string[]> = {
  basic: ["Каталог, корзина и заказы", "AI Studio и оформление витрины", "Товары, остатки, клиенты и аналитика", "Акции, истории и программа лояльности", "Сотрудники, доставка, Kaspi и интеграции", "Постоянная ссылка dukenim.kz/s/магазин"],
  standard: ["Каталог, корзина и заказы", "AI Studio и оформление витрины", "Товары, остатки, клиенты и аналитика", "Акции, истории и программа лояльности", "Сотрудники, доставка, Kaspi и интеграции", "Постоянная ссылка dukenim.kz/s/магазин"],
  pro: ["Каталог, корзина и заказы", "AI Studio и оформление витрины", "Товары, остатки, клиенты и аналитика", "Акции, истории и программа лояльности", "Сотрудники, доставка, Kaspi и интеграции", "Постоянная ссылка dukenim.kz/s/магазин"],
};
