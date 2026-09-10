import {expect,it} from "vitest";
import {filterStock} from "./stock-filter";
const products=[{id:"p",title:"Серик Пальто"}];
const variants=[{product_id:"p",stock_qty:2,sku:"AB-12",size:"M",color:"Розовый"},{product_id:"p",stock_qty:0,sku:null,size:"L",color:null}];
it("searches title, SKU and variant together, ignoring case",()=>expect(filterStock(variants,products,"СЕРИК ab-12 розовый","all")).toHaveLength(1));
it("separates low stock from zero stock",()=>{expect(filterStock(variants,products,"","low")[0].stock_qty).toBe(2);expect(filterStock(variants,products,"","empty")[0].stock_qty).toBe(0);});
it("finds missing SKU without changing quantities",()=>{expect(filterStock(variants,products,"","missing-sku")).toHaveLength(1);expect(variants[0].stock_qty).toBe(2);});
it("does not mutate the input or hide rows for unknown filter",()=>expect(filterStock(variants,products,"","unknown")).toEqual(variants));
