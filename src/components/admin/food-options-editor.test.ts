import { describe, expect, it } from "vitest";
import { parseNumericDraft } from "./food-options-editor";
import { readFoodOptions } from "@/lib/food-options";

describe("food option numeric drafts", () => {
  it("allows clearing, explicit zero and decimal comma without leading-zero concatenation", () => {
    expect(parseNumericDraft("", { max: 10_000 })).toBe(0);
    expect(parseNumericDraft("0", { max: 10_000 })).toBe(0);
    expect(parseNumericDraft("5,5", { max: 10_000 })).toBe(5.5);
    expect(parseNumericDraft("600", { integer: true, max: 100_000 })).toBe(600);
  });

  it("normalizes integer fields and clamps unsafe values", () => {
    expect(parseNumericDraft("12.9", { integer: true, max: 100 })).toBe(12);
    expect(parseNumericDraft("999", { integer: true, max: 100 })).toBe(100);
  });
});

describe("combo persistence", () => {
  it("round-trips added, edited and remaining combo choices", () => {
    const stored = readFoodOptions({
      ingredients: [],
      groups: [{ id: "combo", title: "Напиток", kind: "combo", min: 1, max: 1, options: [
        { id: "cola", label: "Кола", price: 150, variantId: "11111111-1111-4111-8111-111111111111" },
        { id: "tea", label: "Чай", price: 0, variantId: "22222222-2222-4222-8222-222222222222" },
      ] }],
    });
    stored.groups[0].options[0].price = 200;
    stored.groups[0].options.splice(1, 1);
    const reopened = readFoodOptions(JSON.parse(JSON.stringify(stored)));
    expect(reopened.groups[0].options).toEqual([{ id: "cola", label: "Кола", price: 200, variantId: "11111111-1111-4111-8111-111111111111" }]);
  });
});
