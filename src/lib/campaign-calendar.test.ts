import { describe, expect, it } from "vitest";
import { campaignDateTimeInput, campaignIdeaBrief, campaignMonthLabel, getCampaignPlanningMonths, normalizeCampaignHorizon, parseCampaignDateTime } from "./campaign-calendar";

describe("campaign calendar planning", () => {
  it("accepts only the four supported planning horizons", () => {
    expect([1, 2, 3, 7].map(normalizeCampaignHorizon)).toEqual([1, 2, 3, 7]);
    expect(normalizeCampaignHorizon(4)).toBe(1);
  });

  it("uses Kazakhstan calendar months, including year rollover", () => {
    const months = getCampaignPlanningMonths(3, "fashion", new Date("2026-12-31T20:00:00.000Z"));
    expect(months.map(month => month.key)).toEqual(["2027-01", "2027-02", "2027-03"]);
    expect(months[0]).toMatchObject({ startsAt: "2027-01-01", endsAt: "2027-01-31", title: "Новая коллекция" });
    expect(campaignMonthLabel(months[2].key)).toBe("март 2027");
  });

  it("uses the current Kazakhstan day for the current month and does not invent a holiday", () => {
    const months = getCampaignPlanningMonths(2, "food", new Date("2026-10-09T08:00:00.000Z"));
    expect(months[0]).toMatchObject({ key: "2026-10", startsAt: "2026-10-09", endsAt: "2026-10-31" });
    expect(months[0].title).toBe("Сезонное меню");
    expect(months[0].subtitle).not.toMatch(/наурыз|праздник/i);
  });

  it("creates a conservative brief with editable, non-published output", () => {
    const month = getCampaignPlanningMonths(1, "home", new Date("2026-10-09T08:00:00.000Z"))[0];
    const brief = campaignIdeaBrief("Дом", month);
    expect(brief).toContain("редактируемый черновик");
    expect(brief).toContain("Не придумывай цены");
    expect(brief).toContain("Не публикуй");
  });

  it("round-trips date-time fields in Kazakhstan time regardless of server timezone", () => {
    expect(campaignDateTimeInput("2026-10-31T18:59:00.000Z")).toBe("2026-10-31T23:59");
    expect(parseCampaignDateTime("2026-10-31T23:59")).toBe("2026-10-31T18:59:00.000Z");
    expect(parseCampaignDateTime("")).toBeNull();
  });
});
