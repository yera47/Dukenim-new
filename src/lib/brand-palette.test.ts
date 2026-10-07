import {describe,expect,it} from "vitest";
import {customStoreThemeSchema} from "./custom-store-theme";
import {brandThemeFromColors} from "./brand-palette";

describe("logo palette proposal",()=>{
  it("prefers a distinctive usable brand colour over a white logo background",()=>{
    const theme=brandThemeFromColors(["#ffffff","#f8f8f8","#8b2d55"]);
    expect(theme.accent).toBe("#8b2d55");
    expect(customStoreThemeSchema.safeParse(theme).success).toBe(true);
  });
  it("falls back to the neutral Dukenim plum for empty samples",()=>{
    expect(brandThemeFromColors([]).accent).toBe("#56334d");
  });
  it("keeps white logos visible with a neutral accessible accent",()=>{
    expect(brandThemeFromColors(["#ffffff","#f8f8f8"])).toEqual({background:"#f2f2f2",surface:"#fcfcfc",accent:"#222222"});
  });
  it("uses a saturated colour from a multicolour logo instead of its light background",()=>{
    expect(brandThemeFromColors(["#ffffff","#ff9d00","#4b2414"]).accent).toBe("#ff9d00");
  });
});
