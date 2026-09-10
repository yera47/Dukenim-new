import { describe, expect, it } from "vitest";
import {
  integrationProviderGroups,
  integrationProviders,
  integrationConnectionModeLabel,
  integrationProviderLabel,
  isIntegrationProvider,
} from "./providers";

describe("integration provider registry", () => {
  it("contains each provider once", () => {
    const keys = integrationProviders.map((provider) => provider.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("covers the first partnership wave", () => {
    const expected = [
      "rosta", "umag", "paloma365", "billz", "moysklad", "retailcrm", "biznes_ru",
      "subtotal", "insales", "kommo", "bitrix24", "planfix", "megaplan", "s2",
      "okocrm", "envycrm", "keycrm", "salesdrive", "iiko", "r_keeper", "poster",
      "quick_resto", "jowi",
    ];
    expect(expected.every(isIntegrationProvider)).toBe(true);
  });

  it("keeps the owner-facing list grouped", () => {
    expect(integrationProviderGroups.map((group) => group.label)).toEqual([
      "Казахстан",
      "Торговля и учёт",
      "CRM",
      "Рестораны и POS",
      "Другое",
    ]);
    expect(integrationProviderLabel("r_keeper")).toBe("r_keeper");
    expect(integrationProviderLabel("not_selected")).toBe("Не выбрана");
    expect(integrationConnectionModeLabel("oauth_pkce")).toBe("Защищённый OAuth + PKCE");
  });
});
