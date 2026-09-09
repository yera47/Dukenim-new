"use client";
import { useState } from "react";
import { customStoreThemeSchema } from "@/lib/custom-store-theme";
import { paletteByKey } from "@/lib/storefront-theme";
import { contrastInk } from "@/lib/color-contrast";
export function ThemeColorControls({value,paletteKey}:{value:unknown;paletteKey:string}){
 const palette=paletteByKey(paletteKey);
 const [theme,setTheme]=useState(()=>customStoreThemeSchema.safeParse(value).data??{background:palette.background,surface:palette.surface,accent:palette.accent});
 const [error,setError]=useState("");
 return <div><input type="hidden" name="colorTheme" value={JSON.stringify(theme)}/><input type="hidden" name="paletteKey" value={paletteKey}/>
  <p className="text-sm text-neutral-500">Свои цвета — без обязательной готовой палитры. Или обсудите сочетание с AI Studio.</p>
  <div className="mt-4 flex flex-wrap gap-5">{([['background','Фон'],['surface','Карточки'],['accent','Кнопки']] as const).map(([key,label])=><label key={key} className="text-sm">{label}<input aria-label={label} type="color" value={theme[key]} className="mt-2 block h-10 w-20" onChange={event=>{const next={...theme,[key]:event.target.value};if(key==='background'&&contrastInk(next.background)!==contrastInk(next.surface))next.surface=next.background;if(customStoreThemeSchema.safeParse(next).success){setTheme(next);setError('');}else setError('Выберите одинаково светлый или тёмный фон и карточки для читаемого текста.');}}/></label>)}</div>
  <div className="mt-4 rounded-xl p-4" style={{background:theme.background,color:contrastInk(theme.background)}}><span className="rounded-lg p-2" style={{background:theme.surface}}>Карточка товара</span><span className="ml-3 inline-block rounded-lg px-4 py-2" style={{background:theme.accent,color:contrastInk(theme.accent)}}>В корзину</span></div>
  {error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
 </div>;
}
