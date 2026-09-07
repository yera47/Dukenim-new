import { describe, expect, it } from "vitest";
import { catalogRecommendation } from "./catalog-recommendation";
describe("catalog recommendation", () => {
  it("accepts an available template and palette", () => {
    expect(catalogRecommendation({templateKey:"atelier",paletteKey:"mono",rationale:"Минимализм"},["atelier"])).toEqual({templateKey:"atelier",paletteKey:"mono",reason:"Минимализм"});
  });
  it.each([null, {}, {templateKey:"signature",paletteKey:"mono"}, {templateKey:"atelier",paletteKey:"invented"}])("rejects unavailable or malformed choices", value => {
    expect(catalogRecommendation(value,["atelier"])).toBeNull();
  });
});
