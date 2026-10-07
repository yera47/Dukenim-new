import { describe, expect, it } from "vitest";
import { approachForTemplate } from "./commerce-configurations";
import { paletteByKey } from "./storefront-theme";
import { storefrontPreviewHref, storefrontPresetsFor } from "./storefront-presets";
import { launchVerticals } from "./launch-verticals";

describe("instant storefront presets", () => {
  it("offers three distinct working catalogue approaches for every launch industry", () => {
    for (const { id } of launchVerticals) {
      const presets = storefrontPresetsFor(id);
      expect(presets.map((preset) => preset.family)).toEqual(["warm", "soft", "crisp"]);
      expect(new Set(presets.map((preset) => approachForTemplate(preset.templateKey))).size).toBe(3);
      for (const preset of presets) expect(paletteByKey(preset.paletteKey).key).toBe(preset.paletteKey);
    }
  });

  it("builds an owner-only exact preview URL without writing demo products", () => {
    const href = storefrontPreviewHref({ name: "Булка & хлеб", templateKey: "gallery", paletteKey: "clay-milk", example: true });
    const url = new URL(href, "https://dukenim.test");
    expect(url.pathname).toBe("/store-preview");
    expect(url.searchParams.get("content")).toBe("example");
    expect(url.searchParams.get("name")).toBe("Булка & хлеб");
  });
});
