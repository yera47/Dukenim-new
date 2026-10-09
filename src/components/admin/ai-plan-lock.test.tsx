import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiPlanLock } from "./ai-plan-lock";

describe("AI Studio plan lock", () => {
  it("explains the Base limitation and keeps core navigation available", () => {
    const html = renderToStaticMarkup(<AiPlanLock />);
    expect(html).toContain("data-ai-plan-lock");
    expect(html).toContain("AI-инструменты не входят в Base");
    expect(html).toContain('href="/admin/plan"');
    expect(html).toContain('href="/admin/catalog"');
    expect(html).not.toContain("form");
  });
});
