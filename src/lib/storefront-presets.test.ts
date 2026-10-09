import { describe, expect, it } from "vitest";
import { approachForTemplate } from "./commerce-configurations";
import { launchTemplatesForPlan, paletteByKey } from "./storefront-theme";
import { storefrontPreviewHref, storefrontPresetsFor } from "./storefront-presets";
import { launchVerticals } from "./launch-verticals";

describe("instant storefront presets", () => {
  it("offers exactly two segment-specific storefront choices at every plan level", () => {
    for (const { id } of launchVerticals) {
      const presets = storefrontPresetsFor(id);
      expect(presets).toHaveLength(2);
      expect(presets.map((preset) => preset.family)).toEqual(["visual", "quick"]);
      expect(launchTemplatesForPlan("basic", id).map((item) => item.key)).toEqual(presets.map((preset) => preset.templateKey));
      expect(launchTemplatesForPlan("standard", id).map((item) => item.key)).toEqual(presets.map((preset) => preset.templateKey));
      expect(new Set(presets.map((preset) => approachForTemplate(preset.templateKey))).size).toBe(2);
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
