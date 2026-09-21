import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import SegmentExamples from "./page";

it("shows only the premium gallery and quick menu for food", async () => {
  vi.stubGlobal("React", React);
  const html = renderToStaticMarkup(await SegmentExamples({ params: Promise.resolve({ vertical: "food" }) }));
  expect(html).toContain("Сравните два варианта меню");
  expect(html).toContain("Галерея и меню");
  expect(html).toContain("Быстрое меню");
  expect(html).not.toContain("Соберите свой заказ");
  expect((html.match(/Вариант [0-9]/g) ?? [])).toHaveLength(2);
  vi.unstubAllGlobals();
});
