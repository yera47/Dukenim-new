import type { CSSProperties } from "react";
import { paletteByKey, safeBrandColor } from "./storefront-theme";
import { contrastInk } from "./color-contrast";
import { customStoreThemeSchema } from "./custom-store-theme";
export function storefrontStyle(settings: {palette_key?:string|null;brand_color?:string|null;color_theme?:unknown}|null, plan:string, accentColor:string, demo=false):CSSProperties {
  const custom = customStoreThemeSchema.safeParse(demo ? undefined : settings?.color_theme);
  if (custom.success) {
    const { background, surface, accent } = custom.data;
    const ink = contrastInk(background);
    return {"--tenant-accent":accent,"--store-bg":background,"--store-surface":surface,"--store-ink":ink,"--store-muted":ink,"--store-accent-ink":contrastInk(accent)} as CSSProperties;
  }
  const palette=paletteByKey(demo?"mono":settings?.palette_key);
  const accent=demo||plan==="basic"?palette.accent:safeBrandColor(settings?.brand_color,settings?.palette_key?palette.accent:accentColor);
  return {"--tenant-accent":accent,"--store-bg":palette.background,"--store-surface":palette.surface,"--store-ink":palette.ink,"--store-muted":palette.muted,"--store-accent-ink":contrastInk(accent)} as CSSProperties;
}
