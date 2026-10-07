import type { CSSProperties } from "react";
import { paletteByKey, safeBrandColor } from "./storefront-theme";
import { contrastInk } from "./color-contrast";
import { customStoreThemeSchema } from "./custom-store-theme";
type LayoutConfig={corners?:unknown;typography?:unknown};
function profileShape(layout:unknown):CSSProperties{
  const value=(layout&&typeof layout==="object"?layout:{}) as LayoutConfig;
  const radii=value.corners==="square"?["0px","0px"]:value.corners==="soft"?["14px","12px"]:["26px","999px"];
  const display=value.typography==="editorial"?'Georgia,"Times New Roman",serif':value.typography==="technical"?'Consolas,"SFMono-Regular",monospace':'var(--font-manrope),Arial,sans-serif';
  return {"--store-card-radius":radii[0],"--store-button-radius":radii[1],"--store-display-font":display,"--r-card":radii[0],"--r-btn":radii[1]} as CSSProperties;
}
export function storefrontStyle(settings: {palette_key?:string|null;brand_color?:string|null;color_theme?:unknown;layout_config?:unknown}|null, plan:string, accentColor:string, demo=false):CSSProperties {
  const shape=profileShape(settings?.layout_config);
  const custom = customStoreThemeSchema.safeParse(demo ? undefined : settings?.color_theme);
  if (custom.success) {
    const { background, surface, accent } = custom.data;
    const ink = contrastInk(background);
    return {...shape,"--tenant-accent":accent,"--store-bg":background,"--store-surface":surface,"--store-ink":ink,"--store-muted":ink,"--store-accent-ink":contrastInk(accent)} as CSSProperties;
  }
  const palette=paletteByKey(demo?"mono":settings?.palette_key);
  const accent=demo?palette.accent:safeBrandColor(settings?.brand_color,settings?.palette_key?palette.accent:accentColor);
  return {...shape,"--tenant-accent":accent,"--store-bg":palette.background,"--store-surface":palette.surface,"--store-ink":palette.ink,"--store-muted":palette.muted,"--store-accent-ink":contrastInk(accent)} as CSSProperties;
}
