import { Image } from "expo-image";
import { useMemo } from "react";

const paths = {
  house: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3Z"/>',
  "list.bullet.rectangle": '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9h9M8 15h9"/><circle cx="6" cy="9" r=".7" fill="currentColor" stroke="none"/><circle cx="6" cy="15" r=".7" fill="currentColor" stroke="none"/>',
  "square.grid.2x2": '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  ellipsis: '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  "slider.horizontal.3": '<path d="M4 6h6m4 0h6M4 12h10m4 0h2M4 18h2m4 0h10"/><circle cx="12" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
  sparkles: '<path d="m12 2 1.35 4.15L17.5 7.5l-4.15 1.35L12 13l-1.35-4.15L6.5 7.5l4.15-1.35ZM18.5 14l.75 2.25L21.5 17l-2.25.75L18.5 20l-.75-2.25L15.5 17l2.25-.75Z"/>',
  "chevron.right": '<path d="m9 5 7 7-7 7"/>',
  shippingbox: '<path d="m4 7 8-4 8 4-8 4Zm0 0v10l8 4 8-4V7M12 11v10"/>',
  "person.2": '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6M14 15c3.5-1 6 .8 6.5 4"/>',
  "chart.bar": '<path d="M4 20V11h4v9Zm6 0V4h4v16Zm6 0v-6h4v6ZM2 20h20"/>',
  "play.rectangle": '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/>',
  tag: '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z"/><circle cx="8" cy="8" r="1.5"/>',
  gift: '<path d="M4 10h16v11H4Zm-1-5h18v5H3Zm9 0v16M12 5C9 5 7 4 7 2.5 7 1.7 7.8 1 9 1c2 0 3 2 3 4Zm0 0c3 0 5-1 5-2.5C17 1.7 16.2 1 15 1c-2 0-3 2-3 4Z"/>',
  "person.badge.plus": '<circle cx="9" cy="8" r="3"/><path d="M3 20c.5-4 2.5-6 6-6 2.3 0 4 .9 5 2.7M18 14v7m-3.5-3.5h7"/>',
  "truck.box": '<path d="M3 6h11v11H3Zm11 4h4l3 4v3h-7Z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
  "point.3.connected.trianglepath.dotted": '<circle cx="12" cy="4" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="m11 6-5 11m7-11 5 11M7 19h10"/>',
  creditcard: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>',
  message: '<path d="M4 4h16v12H9l-5 4Z"/>',
  gearshape: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
} as const;

export type AppSymbolName = keyof typeof paths;

export function AppSymbol({name,size=20,color="#56334D"}:{name:AppSymbolName;size?:number;color?:string}){
  const uri=useMemo(()=>{
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" color="${color}">${paths[name]}</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  },[color,name]);
  return <Image alt="" accessibilityIgnoresInvertColors source={{uri}} style={{width:size,height:size}} contentFit="contain"/>;
}
