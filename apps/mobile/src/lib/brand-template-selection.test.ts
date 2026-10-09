import { describe, expect, it } from "vitest";
import { initialBrandTemplate, isLegacyBrandTemplate } from "./brand-template-selection";

const choices = [{ key: "atelier" }, { key: "market" }] as const;

describe("brand template preservation", () => {
  it("keeps a saved legacy storefront when only text or photos are edited", () => {
    expect(initialBrandTemplate("signature", choices)).toBe("signature");
    expect(isLegacyBrandTemplate("signature", choices)).toBe(true);
  });

  it("uses a recommended template only for a store without a saved choice", () => {
    expect(initialBrandTemplate(null, choices)).toBe("atelier");
    expect(isLegacyBrandTemplate("market", choices)).toBe(false);
  });
});
