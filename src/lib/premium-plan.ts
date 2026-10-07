export const PREMIUM_PRICE_KZT = 35_000;
export const PREMIUM_BILLING_PERIOD = "month" as const;
export const PREMIUM_PERIOD_STATUS = "monthly_confirmed" as const;

export const premiumFeatures = [
  "AI-инструменты для оформления товаров",
  "Тексты для витрины, историй и публикаций",
  "Кредиты списываются только после успешной генерации",
  "Дополнительные кредиты после запуска защищённой оплаты",
  "Расширенная аналитика после отдельного запуска",
] as const;

export function premiumDraft(_env: NodeJS.ProcessEnv = process.env) {
  void _env;
  return {
    priceKzt: PREMIUM_PRICE_KZT,
    billingPeriod: PREMIUM_BILLING_PERIOD,
    periodStatus: PREMIUM_PERIOD_STATUS,
    photoPackLimit: null,
    features: premiumFeatures,
  };
}
