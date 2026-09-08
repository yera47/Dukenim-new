import type { CSSProperties } from "react";
import { paletteByKey, safeBrandColor } from "./storefront-theme";
export function storefrontStyle(settings: {palette_key?:string|null;brand_color?:string|null}|null, plan:string, accentColor:string, demo=false):CSSProperties {
  const palette=paletteByKey(demo?"mono":settings?.palette_key);
  const accent=demo||plan==="basic"?palette.accent:safeBrandColor(settings?.brand_color,accentColor);
  return {"--tenant-accent":accent,"--store-bg":palette.background,"--store-surface":palette.surface,"--store-ink":palette.ink,"--store-muted":palette.muted,"--store-accent-ink":palette.accentInk} as CSSProperties;
}
