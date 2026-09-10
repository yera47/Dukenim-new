import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/components/admin/catalog-setup-form", () => ({ CatalogSetupForm: () => null }));
vi.mock("@/components/admin/product-form", () => ({ ProductForm: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { AiStudioClient } from "./ai-studio-client";

describe("AI Studio first-run access", () => {
  const props = { enabled: true, imageEnabled: false, brand: false, storeName: "Магазин", slug: "shop", plan: "basic" as const, vertical: "fashion" as const };
  it.each(["building","ready"] as const)("restores the saved design without regenerating or auto-applying at %s",catalogStatus=>{
    const initialDesign={generationId:"8e1a50dd-3dc6-434e-b102-ab37ef181462",design:{templateKey:"studio",paletteKey:"mono",heroTitle:"Сохранённый дизайн",heroSubtitle:"Индивидуальная витрина",heroCtaLabel:"Каталог",rationale:"По пожеланиям"}};
    const html=renderToStaticMarkup(<AiStudioClient {...props} catalogStatus={catalogStatus} initialDesign={initialDesign} initialStructure={{generationId:"old",structure:{sections:[{name:"Старое",description:"Предыдущее предложение"}]}}}/>);
    expect(html).toContain("Последнее предложение восстановлено");
    expect(html).toContain("/store-preview?generation="+initialDesign.generationId);
    expect(html).toContain("Применить оформление");
    expect(html).not.toContain("Оформление применено");
    expect(html).not.toContain("Предыдущее предложение");
  });
  it.each(["ready"] as const)("keeps the assistant available at %s", (catalogStatus) => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus={catalogStatus}/>);
    expect(html).toContain('id="studio-conversation"');
    expect(html).toContain('Написать в поддержку');
    expect(html).not.toContain('Написать человеку');
    expect(html).toMatch(/class="[^"]*workspace[^"]*" aria-label="Диалог с AI Studio"/);
    expect(html).not.toContain('id="studio-message"');
    expect((html.match(/id="studio-conversation"/g) ?? []).length).toBe(1);
    expect(html).toContain("Передать вопрос команде");
    expect(html).toContain("Предложения не публикуются без вашего решения");
    expect(html).not.toContain("после этого AI Studio откроет");
  });
  it("offers in-place catalog creation before the first product", () => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus="not_started"/>);
    expect(html).toContain("Начать создание каталога");
    expect(html).not.toContain("Логотип и правила бренда");
    expect(html).not.toContain("История оформления");
    expect(html).not.toContain("Посмотреть мой каталог");
    expect(html).not.toContain("textarea");
    expect(html).not.toContain('id="studio-message"');
    expect(html).not.toContain("0/800");
    expect(html).not.toContain("5 кредитов");
  });
  it("shows only the first-product stage while building", () => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus="building" catalogPublished={false}/>);
    expect(html).toContain("Добавление первого товара");
    for (const label of ["Свернуть редактор", "Опубликовать магазин", "История оформления", "Логотип и правила бренда", "Создать фон баннера"]) expect(html).not.toContain(label);
  });
  it("does not call a ready catalog published", () => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus="ready"/>);
    expect(html).toContain("Посмотрите глазами покупателя");
    expect(html).toContain("НЕ ОПУБЛИКОВАНО");
  });
  it("keeps unpublished catalog navigation inside private preview", () => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus="ready" catalogPublished={false}/>);
    expect(html).toContain("Опубликовать магазин");
    expect(html).toContain('href="/store-preview"');
    expect(html).not.toContain('href="/s/shop"');
  });
});
