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
    expect(html).not.toContain('Написать человеку');
    expect(html).toMatch(/class="[^"]*workspace[^"]*" aria-label="Диалог с AI Studio"/);
    expect(html).not.toContain('id="studio-message"');
    expect((html.match(/id="studio-conversation"/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-controls="studio-attachment-menu"');
    expect(html).toContain("Предложения не публикуются без вашего решения");
    expect(html).not.toContain("после этого AI Studio откроет");
  });
  it("offers in-place catalog creation before the first product", () => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus="not_started"/>);
    expect(html).toContain("КОРОТКИЕ ШАГИ");
    expect(html).toContain("Соберём магазин без лишних настроек");
    expect(html).not.toContain("Логотип и правила бренда");
    expect(html).not.toContain("История оформления");
    expect(html).not.toContain("Посмотреть мой каталог");
    expect(html).toContain('id="studio-conversation"');
    expect(html).not.toContain('id="studio-message"');
    expect(html).not.toContain("0/800");
    expect(html).not.toContain("5 кредитов");
  });
  it("shows only the first-product stage while building", () => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus="building" catalogPublished={false}/>);
    expect(html).toContain("Добавление первого товара");
    for (const label of ["Свернуть редактор", "Опубликовать магазин", "История оформления", "Создать фон баннера"]) expect(html).not.toContain(label);
    expect(html).toContain('id="studio-conversation"');
    expect(html).toContain("Товар сохранится только после вашей проверки");
  });
  it("does not call a ready catalog published", () => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus="ready"/>);
    expect(html).toContain('id="studio-conversation"');
    expect(html).not.toContain("Завершите запуск магазина");
    expect(html).not.toContain("iframe");
  });
  it("keeps unpublished catalog navigation inside private preview", () => {
    const html = renderToStaticMarkup(<AiStudioClient {...props} catalogStatus="ready" catalogPublished={false} publicationChecks={{product:true,fulfilment:true,tariff:true}}/>);
    expect(html).toContain("Опубликовать магазин");
    expect(html).toContain('href="/store-preview"');
    expect(html).not.toContain('href="/s/shop"');
  });
});
