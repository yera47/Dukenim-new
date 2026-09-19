import type { BusinessVertical } from "@/types/database";
import { nichePresets } from "@/lib/niche-presets";
import { products, type Product } from "@/lib/demo-data";
import { demoMedia } from "@/lib/demo-media";

export const demoVerticals: BusinessVertical[] = ["fashion", "beauty", "food", "flowers", "home", "services", "event", "other"];
export function demoSlug(vertical: BusinessVertical) { return vertical === "fashion" ? "demo-shop" : `demo-${vertical}`; }
export function demoId(vertical: BusinessVertical) { return `10000000-0000-0000-0000-${String(demoVerticals.indexOf(vertical) + 1).padStart(12, "0")}`; }
export function demoVerticalById(id: string) { return demoVerticals.find(vertical => demoId(vertical) === id); }
export function demoVerticalBySlug(slug: string) { return demoVerticals.find(vertical => demoSlug(vertical) === slug); }

const examples: Partial<Record<BusinessVertical, Array<[string, string, number]>>> = {
  beauty: [["Базовый дуэт ухода", "Наборы", 8500], ["Увлажняющий крем", "Лицо", 12500], ["Лосьон для тела", "Тело", 9900], ["Набор ежедневного ухода", "Наборы", 24500], ["Сыворотка", "Лицо", 14500]],
  food: [["Круассан-сэндвич", "Завтраки", 3200], ["Сэндвич с сыром", "Завтраки", 2900], ["Кофе с молоком", "Напитки", 1400], ["Завтрак на двоих", "Наборы", 8500], ["Овощной салат", "Салаты", 3400]],
  flowers: [["Белый букет", "Монобукеты", 22000], ["Сезонная композиция", "Сегодня", 28500], ["Мини-букет", "Монобукеты", 12000], ["Подарочный комплект", "Подарки", 35000]],
  home: [["Настольная лампа", "Свет", 39000], ["Льняной плед", "Текстиль", 25000], ["Керамическая ваза", "Декор", 18500], ["Наволочка", "Текстиль", 7500]],
  services: [["Первая консультация", "Консультации", 15000], ["Разбор задачи", "Консультации", 25000], ["Проектная сессия", "Сессии", 40000], ["Сопровождение", "Сопровождение", 65000]],
  event: [["Открытая лекция", "Лекции", 8000], ["Практикум", "Практикумы", 15000], ["Групповая встреча", "Встречи", 12000], ["Полная программа", "Программы", 35000]],
  other: [["Подарочный набор", "Наборы", 24900], ["Малый набор", "Наборы", 14900], ["Открытка", "Дополнения", 1500], ["Подарочная упаковка", "Дополнения", 2500]],
};

export function demoProductsFor(vertical: BusinessVertical): Product[] {
  if (vertical === "fashion") return products;
  const preset = nichePresets[vertical];
  return (examples[vertical] ?? []).map(([title, category, price], index) => ({
    id: `${vertical}-${index + 1}`, title, category, price,
    foodOptions:vertical==="food"?(index===0?{ingredients:[{id:"cucumber",name:"Огурцы",removable:true},{id:"salad",name:"Салат",removable:true},{id:"croissant",name:"Круассан",removable:false}],groups:[{id:"extras",title:"Добавить к сэндвичу",kind:"addon",min:0,max:2,options:[{id:"cheese",label:"Сыр",price:300,variantId:null},{id:"sauce",label:"Соус",price:150,variantId:null}]}]}:index===3?{ingredients:[],groups:[{id:"drink",title:"Напиток в комбо",kind:"combo",min:1,max:1,options:[{id:"coffee",label:"Кофе с молоком",price:0,variantId:"food-v3"}]},{id:"breakfast",title:"Сэндвич в комбо",kind:"combo",min:1,max:1,options:[{id:"croissant",label:"Круассан-сэндвич",price:300,variantId:"food-v1"},{id:"sandwich",label:"Сэндвич с сыром",price:0,variantId:"food-v2"}]}]}:undefined):undefined,
    description: "Пример позиции для знакомства с возможностями каталога Dukenim. Данные демонстрационные.",
    images: demoMedia[`${vertical}-${index + 1}`] ? [demoMedia[`${vertical}-${index + 1}`]] : index === 0 && preset.imageUrl ? [preset.imageUrl] : [],
    featured: index === 0,
    variants: [{ id: `${vertical}-v${index + 1}`, size: null, color: "Стандарт", stock: 10 }],
  }));
}
