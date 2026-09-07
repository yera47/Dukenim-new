import { describe, expect, it } from "vitest";
import { businessWorkflow } from "./business-workflow";

describe("business-specific catalog workflow", () => {
  it("does not present service capacity as a warehouse or appointment calendar", () => {
    const flow = businessWorkflow("services");
    expect(flow.capacity).toBe(true);
    expect(flow.stockLabel).toBe("Лимиты услуг");
    expect(flow.stockHelp).toContain("автоматической записи пока нет");
    expect(flow.optionLabel).not.toBe("Размер");
  });
  it("distinguishes prepared portions from ingredient inventory", () => {
    const flow = businessWorkflow("food");
    expect(flow.stockLabel).toBe("Наличие блюд");
    expect(flow.optionLabel).toBe("Порция / вес");
    expect(flow.stockHelp).toContain("пока не поддерживаются");
  });
  it("does not promise automatic ticket issuing", () => {
    expect(businessWorkflow("event").stockHelp).toContain("QR-проверка");
    expect(businessWorkflow("event").capacity).toBe(true);
  });
  it.each(["fashion", "beauty", "food", "flowers", "home", "services", "event", "other"] as const)("provides distinct usable copy for %s", vertical => {
    const flow = businessWorkflow(vertical);
    expect(flow.titleExample).toContain("Серик");
    expect(flow.descriptionHint.length).toBeGreaterThan(10);
    expect(flow.stockHelp.length).toBeGreaterThan(20);
  });
});
