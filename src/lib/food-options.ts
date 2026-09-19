import {z} from "zod";
const identifier=z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/);
export const foodOptionsSchema=z.object({
 ingredients:z.array(z.object({id:identifier,name:z.string().trim().min(1).max(60),removable:z.boolean()}).strict()).max(30),
 groups:z.array(z.object({id:identifier,title:z.string().trim().min(1).max(80),kind:z.enum(["addon","combo"]),min:z.number().int().min(0).max(10),max:z.number().int().min(1).max(10),options:z.array(z.object({id:identifier,label:z.string().trim().min(1).max(80),price:z.number().int().min(0).max(1000000),variantId:z.string().uuid().nullable()}).strict()).min(1).max(20)}).strict()).max(8),
}).strict().superRefine((value,ctx)=>{
 const ids=[...value.ingredients.map(i=>i.id),...value.groups.map(g=>g.id),...value.groups.flatMap(g=>g.options.map(o=>o.id))];
 if(new Set(ids).size!==ids.length)ctx.addIssue({code:"custom",message:"Повторяющиеся элементы"});
 for(const group of value.groups){if(group.min>group.max||group.min>group.options.length)ctx.addIssue({code:"custom",message:"Проверьте количество вариантов выбора"});if(group.kind==="combo"&&group.options.some(o=>!o.variantId))ctx.addIssue({code:"custom",message:"Выберите товары для всех вариантов комбо"});}
});
export const foodSelectionSchema=z.object({removed:z.array(identifier).max(30),choices:z.record(identifier,z.array(identifier).max(10))}).strict();
export type FoodOptions=z.infer<typeof foodOptionsSchema>;
export type FoodSelection=z.infer<typeof foodSelectionSchema>;
export const emptyFoodOptions:FoodOptions={ingredients:[],groups:[]};
export const emptyFoodSelection:FoodSelection={removed:[],choices:{}};
export function readFoodOptions(value:unknown):FoodOptions {const parsed=foodOptionsSchema.safeParse(value);return parsed.success?parsed.data:emptyFoodOptions;}
export function foodSelectionKey(variantId:string,selection:FoodSelection){return `${variantId}:${JSON.stringify({removed:[...selection.removed].sort(),choices:Object.fromEntries(Object.entries(selection.choices).filter(([,v])=>v.length).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,[...v].sort()]))})}`;}
export function priceFoodSelection(options:FoodOptions,selection:FoodSelection){
 if(new Set(selection.removed).size!==selection.removed.length||selection.removed.some(id=>!options.ingredients.some(i=>i.id===id&&i.removable)))throw new Error("Проверьте убранные ингредиенты");
 if(Object.keys(selection.choices).some(id=>!options.groups.some(g=>g.id===id)))throw new Error("Состав блюда изменился");
 let extra=0;const labels:string[]=[];
 for(const id of selection.removed)labels.push(`Без ${options.ingredients.find(i=>i.id===id)!.name.toLocaleLowerCase()}`);
 for(const group of options.groups){const ids=selection.choices[group.id]??[];if(new Set(ids).size!==ids.length||ids.length<group.min||ids.length>group.max)throw new Error(`${group.title}: выберите от ${group.min} до ${group.max}`);for(const id of ids){const option=group.options.find(o=>o.id===id);if(!option)throw new Error("Состав блюда изменился");extra+=option.price;labels.push(`${group.title}: ${option.label}`);}}
 return {extra,labels};
}
