import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import type { OwnerStore } from "@/lib/owner";

export type MerchantBrandTheme={background:string;surface:string;accent:string;accentStrong:string;accentInk:"#000000"|"#FFFFFF";cardRadius:number;buttonRadius:number;typography:"modern"|"editorial"|"technical"};

export const DUKENIM_MERCHANT_THEME:MerchantBrandTheme={background:"#F7F8F9",surface:"#FFFFFF",accent:"#56334D",accentStrong:"#40243A",accentInk:"#FFFFFF",cardRadius:22,buttonRadius:16,typography:"modern"};
const validHex=(value:unknown):value is string=>typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value);
function ink(hex:string):"#000000"|"#FFFFFF"{
  const parts=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255).map(value=>value<=.03928?value/12.92:((value+.055)/1.055)**2.4);
  return .2126*parts[0]+.7152*parts[1]+.0722*parts[2]>.179?"#000000":"#FFFFFF";
}
export function themeForStorefront(store:OwnerStore|null|undefined):MerchantBrandTheme{
  const profile=store?.brand_profile;const colors=profile?.color_theme&&typeof profile.color_theme==="object"?profile.color_theme as Record<string,unknown>:{};
  const accent=validHex(colors.accent)?colors.accent:validHex(profile?.brand_color)?profile.brand_color:validHex(store?.accent_color)?store.accent_color:DUKENIM_MERCHANT_THEME.accent;
  const layout=profile?.layout_config&&typeof profile.layout_config==="object"?profile.layout_config as Record<string,unknown>:{};
  const corners=layout.corners;const typography=layout.typography;
  const rgb=[1,3,5].map(index=>Math.round(parseInt(accent.slice(index,index+2),16)*.43).toString(16).padStart(2,"0")).join("");
  return {background:validHex(colors.background)?colors.background:DUKENIM_MERCHANT_THEME.background,surface:validHex(colors.surface)?colors.surface:DUKENIM_MERCHANT_THEME.surface,accent,accentStrong:`#${rgb}`,accentInk:ink(accent),cardRadius:corners==="square"?4:corners==="soft"?14:26,buttonRadius:corners==="square"?4:corners==="soft"?12:999,typography:typography==="editorial"||typography==="technical"?typography:"modern"};
}

// Merchant/admin chrome is deliberately one Dukenim product. Tenant branding is
// resolved only by storefront previews and the public buyer renderer.
export function themeForStore(store:OwnerStore|null|undefined):MerchantBrandTheme{void store;return DUKENIM_MERCHANT_THEME;}

const Context=createContext<{theme:MerchantBrandTheme;applyStore:(store:OwnerStore|null|undefined)=>void}>({theme:DUKENIM_MERCHANT_THEME,applyStore:()=>undefined});
export function MerchantBrandProvider({children}:PropsWithChildren){
  const[theme,setTheme]=useState(DUKENIM_MERCHANT_THEME);const applyStore=useCallback((store:OwnerStore|null|undefined)=>setTheme(themeForStore(store)),[]);
  return <Context.Provider value={useMemo(()=>({theme,applyStore}),[theme,applyStore])}>{children}</Context.Provider>;
}
export const useMerchantBrand=()=>useContext(Context);
