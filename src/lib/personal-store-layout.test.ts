import {describe,expect,it} from "vitest";
import {personalStoreLayout,personalStoreLayoutSchema} from "./personal-store-layout";
import {proposedDesignSettings} from "./ai/design-settings";
const layout={typography:"editorial",hero:"centered",density:"airy",columns:2,corners:"soft",imageRatio:"portrait"} as const;
describe("personal layout",()=>{
 it("accepts a merchant-specific composition",()=>expect(personalStoreLayout(layout)).toEqual(layout));
 it.each([null,{}, {...layout,columns:12},{...layout,columns:"2"},{...layout,hero:"<script>"},{...layout,css:"body{display:none}"}])("ignores invalid or executable configuration",value=>expect(personalStoreLayout(value)).toBeNull());
 it("uses identical settings for saving and preview without changing products",()=>{
  const result=proposedDesignSettings({layout:personalStoreLayoutSchema.parse(layout),templateKey:"gallery",paletteKey:"mono",heroTitle:"Серик",heroSubtitle:"Коллекция",heroCtaLabel:"Каталог",rationale:"Спокойная композиция"},null);
  expect(result.layout_config).toEqual(layout);
  expect(result).not.toHaveProperty("products");
 });
});
