import {describe,it,expect} from "vitest";
import {proposedDesignSettings} from "./design-settings";
describe("shared AI proposal rendering/application",()=>{
  it("uses validated proposed color for both preview and save",()=>{
    const output=proposedDesignSettings({templateKey:"atelier",paletteKey:"mono",brandColor:"#c04455",heroTitle:"Серик",heroSubtitle:"Одежда",heroCtaLabel:"Каталог",rationale:"Цвет бренда"},{brand_color:"#123456",hero_image_url:null});
    expect(output.brand_color).toBe("#c04455");
  });
  it("maps identical copy and preserves merchant image and accent",()=>{
    const output=proposedDesignSettings({templateKey:"atelier",paletteKey:"mono",heroTitle:"Серик Шоп",heroSubtitle:"Одежда для города",heroCtaLabel:"Каталог",rationale:"Спокойный стиль"},{brand_color:"#123456",hero_image_url:"https://example.com/photo.png"});
    expect(output).toEqual({template_key:"atelier",palette_key:"mono",brand_color:"#123456",hero_title:"Серик Шоп",hero_subtitle:"Одежда для города",hero_cta_label:"Каталог",hero_image_url:"https://example.com/photo.png"});
    expect(output).not.toHaveProperty("products");expect(output).not.toHaveProperty("stock");
  });
});
