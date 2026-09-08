import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/components/admin/catalog-setup-form", () => ({ CatalogSetupForm: () => null }));
vi.mock("@/components/admin/product-form", () => ({ ProductForm: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { AiStudioClient } from "./ai-studio-client";

describe("AI Studio first-run access", () => {
  const props = { enabled: true, imageEnabled: false, brand: false, storeName: "Магазин", slug: "shop", plan: "basic" as const, vertical: "fashion" as const };
  it.each(["building", "ready"] as const)("keeps the assistant available at %s", (catalogStatus) => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus={catalogStatus}/>);
    expect(html).toContain('id="studio-conversation"');
    expect(html).not.toContain('id="studio-message"');
    expect((html.match(/id="studio-conversation"/g) ?? []).length).toBe(1);
    expect(html).toContain("Передать вопрос команде");
    expect(html).toContain("Предложения не публикуются без вашего решения");
    expect(html).not.toContain("после этого AI Studio откроет");
  });
  it("offers in-place catalog creation before the first product", () => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus="not_started"/>);
    expect(html).toContain("Создать каталог с AI Studio");
    expect(html).not.toContain('id="studio-message"');
    expect(html).not.toContain("0/800");
    expect(html).not.toContain("5 кредитов");
  });
  it("does not call a ready catalog published", () => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus="ready"/>);
    expect(html).toContain("Посмотрите глазами покупателя");
    expect(html).toContain("НЕ ОПУБЛИКОВАНО");
  });
});
