import {expect,it} from "vitest";
import {grossProfit} from "./order-profit";
it("uses immutable per-unit cost and excludes delivery",()=>expect(grossProfit([{unit_price:1000,unit_cost:400,qty:3}],1)).toBe(1800));
it("does not substitute zero for unknown or missing historical costs",()=>{
 expect(grossProfit([{unit_price:1000,unit_cost:null,qty:3}],1)).toBeNull();
 expect(grossProfit([{unit_price:1000,unit_cost:0,qty:3}],2)).toBeNull();
 expect(grossProfit([],0)).toBeNull();
});
it("supports explicitly zero cost and negative gross margin",()=>{
 expect(grossProfit([{unit_price:100,unit_cost:0,qty:1}],1)).toBe(100);
 expect(grossProfit([{unit_price:100,unit_cost:150,qty:1}],1)).toBe(-50);
});
