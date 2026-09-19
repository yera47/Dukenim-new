import type {Product} from "./demo-data";
import {emptyFoodOptions,emptyFoodSelection,foodSelectionKey,priceFoodSelection,type FoodSelection} from "./food-options";
export type CartItem={lineId:string;product:Product;variantId:string;qty:number;selection:FoodSelection;unitPrice:number;labels:string[]};
export const cartLimit=(product:Product,variantId:string)=>Math.max(0,Math.min(20,product.variants.find(v=>v.id===variantId)?.stock??0));
export function cartQuantity(items:CartItem[],variantId:string){return items.filter(i=>i.variantId===variantId).reduce((sum,i)=>sum+i.qty,0);}
export function addCartItem(items:CartItem[],product:Product,variantId:string,selection:FoodSelection=emptyFoodSelection){
 const limit=cartLimit(product,variantId);if(cartQuantity(items,variantId)>=limit)return items;
 const {extra,labels}=priceFoodSelection(product.foodOptions??emptyFoodOptions,selection);const lineId=foodSelectionKey(variantId,selection);
 const found=items.find(i=>i.lineId===lineId);
 return found?items.map(i=>i.lineId===lineId?{...i,qty:i.qty+1}:i):[...items,{lineId,product,variantId,qty:1,selection,unitPrice:product.price+extra,labels}];
}
export function setCartQuantity(items:CartItem[],lineId:string,qty:number){
 if(!Number.isInteger(qty))return items;
 const item=items.find(i=>i.lineId===lineId||i.variantId===lineId);if(!item)return items;
 const available=cartLimit(item.product,item.variantId)-cartQuantity(items,item.variantId)+item.qty;
 return items.map(i=>i.lineId===item.lineId?{...i,qty:Math.max(0,Math.min(qty,available))}:i).filter(i=>i.qty>0);
}
export function editCartItem(items:CartItem[],lineId:string,selection:FoodSelection){
 const item=items.find(i=>i.lineId===lineId);if(!item)return items;
 const {extra,labels}=priceFoodSelection(item.product.foodOptions??emptyFoodOptions,selection);const newId=foodSelectionKey(item.variantId,selection);
 const other=items.find(i=>i.lineId===newId&&i.lineId!==lineId);
 return other?items.filter(i=>i.lineId!==lineId).map(i=>i.lineId===newId?{...i,qty:i.qty+item.qty}:i):items.map(i=>i.lineId===lineId?{...i,lineId:newId,selection,unitPrice:i.product.price+extra,labels}:i);
}
