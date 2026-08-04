export type Plan = "basic" | "standard" | "pro";
export const planRank: Record<Plan, number> = { basic: 0, standard: 1, pro: 2 };
export const planPrice: Record<Plan, number> = { basic: 9900, standard: 19900, pro: 34900 };
export const planName: Record<Plan, string> = { basic: "Старт", standard: "Бизнес", pro: "Рост" };
export function hasPlan(current: Plan, required: Plan) { return planRank[current] >= planRank[required]; }
export const planFeatures: Record<Plan, string[]> = {
  basic: ["Сайт и каталог", "Заказы и уведомления", "Собственный адрес магазина", "Базовая статистика"],
  standard: ["Всё из тарифа Старт", "Склад и офлайн-продажи", "Клиенты и CRM", "Полная аналитика"],
  pro: ["Всё из тарифа Бизнес", "Расширенные роли команды", "Приоритетная поддержка", "Дополнительные интеграции"],
};
