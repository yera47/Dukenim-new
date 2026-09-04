import { describe, expect, it } from "vitest";
import { aiCreditCost, BannerBriefRejected, guardBannerBrief } from "./studio-guard";

describe("guardBannerBrief", () => {
  it("rejects briefs that ask for apparel/product photography", () => {
    expect(() => guardBannerBrief("сгенерируй фото футболки на модели")).toThrow(BannerBriefRejected);
    expect(() => guardBannerBrief("баннер про новую куртку")).toThrow(BannerBriefRejected);
    expect(() => guardBannerBrief("generate a photo of sneakers")).toThrow(BannerBriefRejected);
  });

  it("allows a promotional/ad-only brief", () => {
    expect(() => guardBannerBrief("осенняя распродажа, тёплые тона, скидка до 30%")).not.toThrow();
  });
});

describe("aiCreditCost", () => {
  it("prices every intent above zero and banners well above text drafts", () => {
    for (const cost of Object.values(aiCreditCost)) expect(cost).toBeGreaterThan(0);
    expect(aiCreditCost.banner).toBeGreaterThan(aiCreditCost.hero);
    expect(aiCreditCost.banner).toBeGreaterThan(aiCreditCost.catalog_structure);
  });
});
