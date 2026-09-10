export const integrationProviderGroups = [
  {
    key: "kazakhstan",
    label: "Казахстан",
    providers: [
      { key: "rosta", label: "Rosta", connection: "merchant_token" },
      { key: "umag", label: "UMAG", connection: "partner_review" },
      { key: "paloma365", label: "Paloma365", connection: "partner_review" },
      { key: "billz", label: "BILLZ", connection: "partner_review" },
    ],
  },
  {
    key: "commerce",
    label: "Торговля и учёт",
    providers: [
      { key: "moysklad", label: "МойСклад", connection: "oauth" },
      { key: "retailcrm", label: "RetailCRM", connection: "merchant_token" },
      { key: "biznes_ru", label: "Бизнес.Ру", connection: "partner_review" },
      { key: "subtotal", label: "Subtotal", connection: "merchant_token" },
      { key: "insales", label: "inSales", connection: "app_install" },
    ],
  },
  {
    key: "crm",
    label: "CRM",
    providers: [
      { key: "kommo", label: "Kommo / amoCRM", connection: "oauth" },
      { key: "bitrix24", label: "Bitrix24", connection: "oauth" },
      { key: "planfix", label: "Planfix", connection: "oauth_pkce" },
      { key: "megaplan", label: "Мегаплан", connection: "app_install" },
      { key: "s2", label: "S2 / SalesapCRM", connection: "merchant_token" },
      { key: "okocrm", label: "OkoCRM", connection: "merchant_token" },
      { key: "envycrm", label: "EnvyCRM", connection: "partner_review" },
      { key: "keycrm", label: "keyCRM", connection: "merchant_token" },
      { key: "salesdrive", label: "SalesDrive", connection: "merchant_token" },
    ],
  },
  {
    key: "restaurant",
    label: "Рестораны и POS",
    providers: [
      { key: "iiko", label: "iiko", connection: "partner_review" },
      { key: "r_keeper", label: "r_keeper", connection: "aggregator_token" },
      { key: "poster", label: "Poster", connection: "oauth" },
      { key: "quick_resto", label: "Quick Resto", connection: "partner_review" },
      { key: "jowi", label: "JOWI", connection: "partner_review" },
    ],
  },
  {
    key: "other",
    label: "Другое",
    providers: [
      { key: "one_c", label: "1С", connection: "integrator" },
      { key: "other", label: "Другая система", connection: "unknown" },
    ],
  },
] as const;

type IntegrationProviderDefinition = (typeof integrationProviderGroups)[number]["providers"][number];

export const integrationProviders: readonly IntegrationProviderDefinition[] = integrationProviderGroups.flatMap(
  (group) => [...group.providers] as IntegrationProviderDefinition[],
);
export type IntegrationProvider = IntegrationProviderDefinition["key"];
export type IntegrationConnectionMode = IntegrationProviderDefinition["connection"];

const providerKeys = new Set<string>(integrationProviders.map((provider) => provider.key));
const providerLabels = new Map<string, string>(integrationProviders.map((provider) => [provider.key, provider.label]));

const connectionModeLabels: Record<IntegrationConnectionMode, string> = {
  oauth: "OAuth каждого аккаунта",
  oauth_pkce: "Защищённый OAuth + PKCE",
  merchant_token: "Ключ каждого магазина",
  partner_review: "После согласования с партнёром",
  app_install: "Установка приложения магазином",
  aggregator_token: "Стенд и лицензии поставщика",
  integrator: "Через сертифицированного интегратора",
  unknown: "Требуется техническая проверка",
};

export function isIntegrationProvider(value: string): value is IntegrationProvider {
  return providerKeys.has(value);
}

export function integrationProviderLabel(value: string): string {
  if (value === "not_selected") return "Не выбрана";
  return providerLabels.get(value) ?? value;
}

export function integrationConnectionModeLabel(value: IntegrationConnectionMode): string {
  return connectionModeLabels[value];
}
