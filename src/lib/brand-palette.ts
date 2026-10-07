import { customStoreThemeSchema, type CustomStoreTheme } from "./custom-store-theme";

type Rgb = { r:number; g:number; b:number };

function rgb(hex:string):Rgb|null {
  if(!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return {r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)};
}

function hex({r,g,b}:Rgb) {
  return `#${[r,g,b].map(value=>Math.max(0,Math.min(255,Math.round(value))).toString(16).padStart(2,"0")).join("")}`;
}

function blend(source:Rgb,target:Rgb,amount:number):Rgb {
  return {r:source.r*(1-amount)+target.r*amount,g:source.g*(1-amount)+target.g*amount,b:source.b*(1-amount)+target.b*amount};
}

function score(color:Rgb) {
  const max=Math.max(color.r,color.g,color.b),min=Math.min(color.r,color.g,color.b);
  const saturation=max-min;
  const luminance=(color.r*299+color.g*587+color.b*114)/1000;
  const usable=luminance>28&&luminance<224?140:0;
  return saturation*2+usable-Math.abs(luminance-112)*.35;
}

function distance(a:Rgb,b:Rgb){return Math.sqrt((a.r-b.r)**2+(a.g-b.g)**2+(a.b-b.b)**2);}

function usableAccent(candidate:Rgb|undefined){
  if(!candidate)return {r:86,g:51,b:77};
  const white={r:255,g:255,b:255};
  // A white logo still needs a visible neutral control colour. This avoids
  // turning every low-information mark into the Dukenim plum fallback.
  if(distance(candidate,white)<52)return {r:34,g:34,b:34};
  return candidate;
}

/** Turns sampled logo colours into an accessible light storefront proposal.
 * It never mutates settings; the owner still has to apply the proposal.
 */
export function brandThemeFromColors(colors:string[]):CustomStoreTheme {
  const candidates=colors.map(value=>({value:value.toLowerCase(),color:rgb(value)})).filter((item):item is {value:string;color:Rgb}=>Boolean(item.color));
  const selected=[...candidates].sort((a,b)=>score(b.color)-score(a.color))[0];
  const accent=usableAccent(selected?.color);
  const white={r:255,g:255,b:255};
  const theme={background:hex(blend(accent,white,.94)),surface:hex(blend(accent,white,.985)),accent:hex(accent)};
  return customStoreThemeSchema.parse(theme);
}
