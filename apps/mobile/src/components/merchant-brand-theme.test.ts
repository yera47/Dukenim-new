import {describe,expect,it} from "vitest";
import {DUKENIM_MERCHANT_THEME,themeForStore,themeForStorefront} from "./merchant-brand-theme";
import type {OwnerStore} from "@/lib/owner";

const store={id:"tenant-a",name:"A",slug:"a",business_vertical:"flowers",catalog_published:true,onboarding_completed:true,catalog_status:"ready",plan:"basic",next_plan:"standard",preferred_billing_period:"monthly"} satisfies OwnerStore;

describe("merchant brand theme",()=>{
  it("keeps merchant chrome on one Dukenim theme for every tenant",()=>{
    expect(themeForStore({...store,brand_profile:{brand_color:"#F59B14",color_theme:{background:"#FFF7E8",surface:"#FFFCF5",accent:"#F59B14"},layout_config:{typography:"modern",corners:"soft"}}})).toEqual(DUKENIM_MERCHANT_THEME);
  });
  it("still resolves persisted tenant branding for storefront previews",()=>{
    expect(themeForStorefront({...store,brand_profile:{brand_color:"#F59B14",color_theme:{background:"#FFF7E8",surface:"#FFFCF5",accent:"#F59B14"},layout_config:{typography:"modern",corners:"soft"}}})).toMatchObject({background:"#FFF7E8",surface:"#FFFCF5",accent:"#F59B14",accentInk:"#000000",cardRadius:14,buttonRadius:12});
  });
  it("derives each storefront independently and resets safely",()=>{
    const rose=themeForStorefront({...store,id:"rose",brand_profile:{brand_color:"#9B315D",color_theme:{background:"#FFF8F3",surface:"#FFFDF9",accent:"#9B315D"},layout_config:{corners:"rounded"}}});
    const bulka=themeForStorefront({...store,id:"bulka",brand_profile:{brand_color:"#F59B14",color_theme:{background:"#FFF7E8",surface:"#FFFCF5",accent:"#F59B14"},layout_config:{corners:"soft"}}});
    const reset=themeForStorefront(null);
    expect(rose.accent).toBe("#9B315D");expect(bulka.accent).toBe("#F59B14");expect(bulka.background).not.toBe(rose.background);expect(reset.accent).toBe(DUKENIM_MERCHANT_THEME.accent);
  });
});
