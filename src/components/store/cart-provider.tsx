"use client";
import {createContext,useContext,useMemo,useState,useEffect} from "react";
import type {Product} from "@/lib/demo-data";
import {addCartItem,setCartQuantity,editCartItem,type CartItem} from "@/lib/cart-items";
import {foodSelectionSchema,type FoodSelection} from "@/lib/food-options";
export {cartLimit} from "@/lib/cart-items";
type Cart={items:CartItem[];add:(p:Product,v:string,selection?:FoodSelection)=>void;edit:(id:string,selection:FoodSelection)=>void;setQuantity:(id:string,qty:number)=>void;remove:(id:string)=>void;clear:()=>void;count:number;total:number};
const Context=createContext<Cart|null>(null);
export function CartProvider({children,storageKey}:{children:React.ReactNode;storageKey?:string}){
 const [items,setItems]=useState<CartItem[]>([]),[loaded,setLoaded]=useState(false);
 useEffect(()=>{try{if(storageKey){const saved=JSON.parse(localStorage.getItem(`dukenim:cart:${storageKey}`)??"[]");if(Array.isArray(saved)&&saved.length<=50){let restored:CartItem[]=[];for(const item of saved){const selection=foodSelectionSchema.parse(item.selection);if(!Number.isInteger(item.qty)||item.qty<1||item.qty>20||typeof item.product?.price!=="number"||!Array.isArray(item.product?.variants))continue;for(let n=0;n<item.qty;n++)restored=addCartItem(restored,item.product,item.variantId,selection);}setItems(restored);}}}catch{/* An invalid local cache never becomes an order. */}setLoaded(true);},[storageKey]);
 useEffect(()=>{if(loaded&&storageKey)try{localStorage.setItem(`dukenim:cart:${storageKey}`,JSON.stringify(items));}catch{}},[items,loaded,storageKey]);
 const value=useMemo<Cart>(()=>({items,add:(product,variantId,selection)=>setItems(previous=>addCartItem(previous,product,variantId,selection)),edit:(id,selection)=>setItems(previous=>editCartItem(previous,id,selection)),setQuantity:(id,qty)=>setItems(previous=>setCartQuantity(previous,id,qty)),remove:id=>setItems(previous=>previous.filter(i=>i.lineId!==id)),clear:()=>setItems([]),count:items.reduce((sum,i)=>sum+i.qty,0),total:items.reduce((sum,i)=>sum+i.unitPrice*i.qty,0)}),[items]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCart(){const value=useContext(Context);if(!value)throw new Error("CartProvider missing");return value;}
