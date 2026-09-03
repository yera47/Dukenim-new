export type Palette = { key:string; name:string; background:string; surface:string; ink:string; muted:string; accent:string; accentInk:string };

// Curated combinations only: a Start customer chooses a coherent system, never random independent colors.
export const palettes: Palette[] = [
  {key:"ink-brass",name:"Графит и латунь",background:"#0a0f0e",surface:"#151d1a",ink:"#f4eee3",muted:"#b8b4aa",accent:"#d7b36c",accentInk:"#13110b"},
  {key:"paper-forest",name:"Бумага и лес",background:"#f6f2e9",surface:"#ffffff",ink:"#10231c",muted:"#587066",accent:"#176b4e",accentInk:"#f7f4eb"},
  {key:"clay-milk",name:"Глина и молоко",background:"#fbf4ee",surface:"#fffdf9",ink:"#2c1b18",muted:"#765f59",accent:"#ae5d42",accentInk:"#fffaf4"},
  {key:"ocean-sand",name:"Океан и песок",background:"#edf4f3",surface:"#ffffff",ink:"#102a35",muted:"#55707a",accent:"#0c617a",accentInk:"#f3fbfd"},
  {key:"plum-stone",name:"Слива и камень",background:"#f4f0f2",surface:"#fffdfd",ink:"#261924",muted:"#6d5868",accent:"#6b315d",accentInk:"#fff8fd"},
  {key:"cobalt-cloud",name:"Кобальт и облако",background:"#f2f5fb",surface:"#ffffff",ink:"#172343",muted:"#5d6a85",accent:"#2852bb",accentInk:"#f7f9ff"},
  {key:"olive-linen",name:"Олива и лён",background:"#f1f0e6",surface:"#fcfbf5",ink:"#293020",muted:"#6a705d",accent:"#697a38",accentInk:"#fbfced"},
  {key:"cherry-cream",name:"Вишня и крем",background:"#fff5f2",surface:"#fffdfc",ink:"#301719",muted:"#765557",accent:"#a92f3d",accentInk:"#fff8f7"},
  {key:"terra-charcoal",name:"Терракота и уголь",background:"#201e1c",surface:"#302b27",ink:"#f4ebe1",muted:"#c5b5a6",accent:"#cb744e",accentInk:"#25150f"},
  {key:"mint-charcoal",name:"Мята и уголь",background:"#101c19",surface:"#1a2925",ink:"#eaf5f0",muted:"#b3c7bf",accent:"#59d6a2",accentInk:"#082116"},
  {key:"rose-ink",name:"Роза и тушь",background:"#211b20",surface:"#302630",ink:"#f8edf3",muted:"#c8b8c1",accent:"#db8ab7",accentInk:"#301123"},
  {key:"sunset-navy",name:"Закат и тёмно-синий",background:"#101a2d",surface:"#17253e",ink:"#f3f4f7",muted:"#bdc4d0",accent:"#ff9d58",accentInk:"#2d1607"},
];

export const templateCatalog = [
  {key:"atelier",name:"Ателье",minPlan:"basic",description:"Редакционная подача для одежды, декора и авторских товаров."},
  {key:"studio",name:"Студия",minPlan:"basic",description:"Чистый каталог с упором на товар и быстрый заказ."},
  {key:"market",name:"Маркет",minPlan:"basic",description:"Практичная витрина для ассортимента и категорий."},
  {key:"journal",name:"Журнал",minPlan:"standard",description:"Истории, подборки и коллекции для бренда."},
  {key:"gallery",name:"Галерея",minPlan:"standard",description:"Премиальная подача коллекций, акций и кампаний."},
  {key:"signature",name:"Сигнатура",minPlan:"standard",description:"Гибкая витрина для собственного домена."},
] as const;

// The first-run choice is deliberately compact: two distinct, curated directions per public plan.
// The full builder remains available later in settings for eligible plans.
export const catalogLaunchTemplates = {
  basic: [
    { key: "atelier", benefit: "Выразительная обложка и крупные карточки — лучше для одежды, косметики и авторских вещей." },
    { key: "market", benefit: "Быстрый просмотр ассортимента и категорий — лучше для широкого каталога и повторных заказов." },
  ],
  standard: [
    { key: "journal", benefit: "Подборки, история бренда и коллекции — подходит магазинам с сильной визуальной подачей." },
    { key: "gallery", benefit: "Премиальная витрина с акциями и бренд-блоками — для собственной айдентики и кампаний." },
  ],
} as const;

export function launchTemplatesForPlan(plan: "basic" | "standard" | "pro") {
  return catalogLaunchTemplates[plan === "basic" ? "basic" : "standard"];
}

export function paletteByKey(key:string|null|undefined){return palettes.find((item)=>item.key===key)??palettes[0]}
function luminance(hex:string){const value=hex.replace("#","");const rgb=[0,2,4].map((offset)=>parseInt(value.slice(offset,offset+2),16)/255).map((v)=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]}
export function safeBrandColor(value:string|null|undefined, fallback:string){if(!value||!/^#[0-9a-fA-F]{6}$/.test(value))return fallback;return luminance(value)>.8||luminance(value)<.06?fallback:value}
