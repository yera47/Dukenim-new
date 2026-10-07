export type SaasBillingAvailability = { available: false; provider: null; candidate: null; currency: "KZT"; message: string };

// Prices and monthly period are owner-confirmed. Provider selection stays neutral:
// no currency conversion or recurring price may be invented for a KZT offer.
export function getSaasBillingAvailability(): SaasBillingAvailability {
  return {
    available: false,
    provider: null,
    candidate: null,
    currency: "KZT",
    message: "Онлайн-оплата подписки пока недоступна. Цены в тенге и месячный период подтверждены; платёжный провайдер будет выбран после проверки тенговых рекуррентных платежей.",
  };
}
