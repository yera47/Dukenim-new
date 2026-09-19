"use client";
import {Minus,Plus} from "lucide-react";
import type {Product} from "@/lib/demo-data";
import {cartLimit,useCart} from "./cart-provider";
export function QuantityControl({product,variantId,qty,lineId}:{product:Product;variantId:string;qty:number;lineId?:string}){
 const {setQuantity,items}=useCart();const count=items.filter(i=>i.variantId===variantId).reduce((sum,i)=>sum+i.qty,0);const target=lineId??items.find(i=>i.variantId===variantId)?.lineId??variantId;
 return <div className="quantity-control" role="group" aria-label={`Количество: ${product.title}`}>
  <button type="button" aria-label={`Уменьшить количество: ${product.title}`} onClick={()=>setQuantity(target,qty-1)}><Minus size={16}/></button>
  <output aria-live="polite" aria-label={`В корзине: ${product.title}`}>{qty}</output>
  <button type="button" disabled={count>=cartLimit(product,variantId)} aria-label={`Увеличить количество: ${product.title}`} onClick={()=>setQuantity(target,qty+1)}><Plus size={16}/></button>
 </div>;
}
