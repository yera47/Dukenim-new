import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/components/admin/catalog-setup-form", () => ({ CatalogSetupForm: () => null }));
vi.mock("@/components/admin/product-form", () => ({ ProductForm: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { AiStudioClient } from "./ai-studio-client";

describe("AI Studio first-run access", () => {
  const props = { enabled: true, imageEnabled: false, brand: false, storeName: "Магазин", slug: "shop", plan: "basic" as const, vertical: "fashion" as const };
  it.each(["not_started", "building", "ready"] as const)("keeps the assistant available at %s", (catalogStatus) => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus={catalogStatus}/>);
    expect(html).toContain('id="studio-message"');
    expect(html).toContain("Разделы каталога");
    expect(html).toContain("Передать вопрос команде");
    expect(html).not.toContain("после этого AI Studio откроет");
  });
  it("offers in-place catalog creation before the first product", () => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus="not_started"/>);
    expect(html).toContain("Создать каталог здесь");
    expect(html).toContain("Основа ещё не сохранена");
  });
  it("does not call a ready catalog published", () => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus="ready"/>);
    expect(html).toContain("Проверить витрину");
    expect(html).toContain("НЕ ОПУБЛИКОВАНО");
  });
});
