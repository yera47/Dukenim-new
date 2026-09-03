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
export const planFeatures: Record<Plan, string[]> = {
  basic: ["Готовые шаблоны под нишу", "Подобранные цветовые палитры", "Логотип, каталог и заказы", "Адрес slug.dukenim.kz", "Постоянный футер Dukenim"],
  standard: ["Всё из тарифа «Старт»", "Точная палитра бренда", "Собственный домен", "Акции, кампании и бренд-блоки", "Расширенная аналитика витрины"],
  pro: ["Всё из тарифа «Старт»", "Точная палитра бренда", "Собственный домен", "Акции, кампании и бренд-блоки", "Расширенная аналитика витрины"],
};
