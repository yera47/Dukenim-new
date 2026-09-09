import { describe, expect, it } from "vitest";
import { customStoreThemeSchema, themeVariations } from "./custom-store-theme";
import { storefrontStyle } from "./storefront-style";
import { catalogBuilderStateSchema } from "./catalog-builder-draft";

const theme={background:"#f7dce6",surface:"#fff3f7",accent:"#164a36"};
describe("individual storefront colours",()=>{
  it("accepts requested pink and green without a preset",()=>expect(customStoreThemeSchema.parse(theme)).toEqual(theme));
  it("rejects CSS injection and incomplete objects",()=>{
    expect(customStoreThemeSchema.safeParse({...theme,accent:"url(https://evil.test)"}).success).toBe(false);
    expect(customStoreThemeSchema.safeParse({background:theme.background}).success).toBe(false);
    expect(customStoreThemeSchema.safeParse({...theme,code:"x"}).success).toBe(false);
  });
  it("does not allow an unreadable common foreground",()=>expect(customStoreThemeSchema.safeParse({...theme,surface:"#000000"}).success).toBe(false));
  it("makes three valid distinct shade choices",()=>{
    const choices=themeVariations(theme);
    expect(choices).toHaveLength(3);
    expect(new Set(choices.map(c=>JSON.stringify(c.theme))).size).toBe(3);
    choices.forEach(c=>expect(customStoreThemeSchema.safeParse(c.theme).success).toBe(true));
  });
  it("uses identical custom tokens on both plans",()=>{
    for(const plan of ["basic","standard"]){
      const css=storefrontStyle({color_theme:theme,palette_key:"mono"},plan,"#ffffff");
      expect(css).toMatchObject({"--store-bg":theme.background,"--store-surface":theme.surface,"--tenant-accent":theme.accent,"--store-ink":"#000000","--store-accent-ink":"#ffffff"});
    }
  });
  it("keeps legacy settings and isolates demo themes",()=>{
    expect(storefrontStyle({color_theme:{invalid:true},palette_key:"mono"},"basic","#000000")).toHaveProperty("--store-bg","#ffffff");
    expect(storefrontStyle({color_theme:theme},"standard","#000000",true)).toHaveProperty("--store-bg","#ffffff");
  });
  it("persists selected shades in private builder state",()=>{
    expect(catalogBuilderStateSchema.parse({step:1,catalogName:"Серик Шоп",templateKey:"atelier",paletteKey:"mono",brief:"Косметика",colorTheme:theme}).colorTheme).toEqual(theme);
  });
});
