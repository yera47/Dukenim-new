import { launchVerticals } from "./launch-verticals";
export const commerceApproaches = ["collection", "assortment", "guided"] as const;
export type CommerceApproach = typeof commerceApproaches[number];
export type CommerceVertical = typeof launchVerticals[number]["id"];
const copy: Record<CommerceVertical, readonly [string,string,string]> = {
  fashion:["Коллекция и образ","Одежда по категориям","Соберите свой образ"],
  beauty:["История ухода","Все средства рядом","Выберите свой уход"],
  food:["Блюда крупным планом","Быстрый выбор из меню","Соберите свой заказ"],
  flowers:["Авторские букеты","Букеты в каталоге","Выберите подарок"],
  home:["Предметы и интерьер","Каталог для дома","Начните с комнаты"],
  other:["Коллекция магазина","Весь ассортимент","Найдите нужный раздел"],
};
const benefits = [
  "Крупная фотография знакомит с продуктом, затем покупатель переходит к ассортименту. Для небольшой выразительной коллекции.",
  "Товары, поиск и фильтры без длинной обложки. Для большого ассортимента и покупателей, которые знают, что ищут.",
  "Сначала понятные разделы с фотографиями, затем товары. Для покупателей, которым нужна помощь с первым выбором.",
] as const;
export const commerceConfigurations = launchVerticals.flatMap(({id:vertical})=>commerceApproaches.map((approach,index)=>({
  id:`${vertical}-${approach}`,vertical,approach,title:copy[vertical][index],description:benefits[index],
  href:`/demo/${vertical}/${approach}`,
})));
export function configurationFor(vertical:string,approach:string) {
  return commerceConfigurations.find(item=>item.vertical===vertical&&item.approach===approach);
}
export function approachForTemplate(template:string):CommerceApproach {
  return template==="market"||template==="gallery"?"assortment":template==="studio"||template==="signature"?"guided":"collection";
}
