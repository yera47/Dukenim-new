import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiPlanLock } from "./ai-plan-lock";

describe("AI Studio plan lock", () => {
  it("explains expired access without suggesting a separate AI tier", () => {
    const html = renderToStaticMarkup(<AiPlanLock />);
    expect(html).toContain("data-ai-plan-lock");
    expect(html).toContain("Пробный период завершён");
    expect(html).toContain('href="/admin/plan"');
    expect(html).toContain('href="/admin/catalog"');
    expect(html).not.toContain("form");
  });
});
