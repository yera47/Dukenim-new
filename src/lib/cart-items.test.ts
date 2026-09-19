import {describe,it,expect} from "vitest";
import {addCartItem,setCartQuantity,editCartItem} from "./cart-items";
import type {Product} from "./demo-data";
const product:Product={id:"p",title:"Burger",description:"",category:"Food",price:2000,variants:[{id:"v",size:null,color:"",stock:3}],foodOptions:{ingredients:[{id:"cucumber",name:"Огурцы",removable:true}],groups:[{id:"extra",title:"Добавки",kind:"addon",min:0,max:1,options:[{id:"cheese",label:"Сыр",price:200,variantId:null}]}]}};
describe("configured cart",()=>{
 it("keeps distinct recipes separate, merges identical selections and prices additions",()=>{let items=addCartItem([],product,"v");items=addCartItem(items,product,"v",{removed:["cucumber"],choices:{extra:["cheese"]}});items=addCartItem(items,product,"v",{removed:["cucumber"],choices:{extra:["cheese"]}});expect(items).toHaveLength(2);expect(items[1].unitPrice).toBe(2200);expect(items[1].qty).toBe(2);expect(items[1].labels).toContain("Без огурцы");});
 it("caps aggregate quantity across configured lines and removes a zero quantity",()=>{let items=addCartItem([],product,"v");items=addCartItem(items,product,"v",{removed:["cucumber"],choices:{}});items=setCartQuantity(items,items[1].lineId,20);expect(items.map(i=>i.qty)).toEqual([1,2]);expect(addCartItem(items,product,"v")).toEqual(items);expect(setCartQuantity(items,items[0].lineId,0)).toHaveLength(1);});
 it("editing merges compatible lines without losing quantity or charging old extras",()=>{let items=addCartItem([],product,"v");items=addCartItem(items,product,"v",{removed:[],choices:{extra:["cheese"]}});items=editCartItem(items,items[1].lineId,{removed:[],choices:{}});expect(items).toHaveLength(1);expect(items[0].qty).toBe(2);expect(items[0].unitPrice).toBe(2000);});
 it("rejects fabricated ingredients and unknown choices",()=>{expect(()=>addCartItem([],product,"v",{removed:["invented"],choices:{}})).toThrow();expect(()=>addCartItem([],product,"v",{removed:[],choices:{extra:["free"]}})).toThrow();});
});
