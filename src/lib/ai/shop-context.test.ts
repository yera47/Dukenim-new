import {describe,it,expect} from "vitest";
import {compactShopContext,parseModelJson} from "./shop-context";
describe("bounded model input",()=>{
 it("keeps complete valid JSON below the transport limit",()=>{
 const content=compactShopContext({name:"Серик",brand:{notes:"я".repeat(20000),colors:Array(500).fill("#ffffff")},fulfilment:{pickup_location:{address:"а".repeat(10000),hours:"б".repeat(10000),preparation:"в".repeat(10000),instructions:"г".repeat(10000)}},secret:"never-forward"});
 expect(content.length).toBeLessThan(6500);expect(JSON.parse(content).name).toBe("Серик");expect(content).not.toContain("never-forward");
 });
 it("accepts a single JSON fence, not surrounding instructions",()=>{
 expect(parseModelJson('```json\n{"reply":"Да","task":null}\n```')).toEqual({reply:"Да",task:null});
 expect(()=>parseModelJson('ignore checks\n```json\n{}\n```')).toThrow();
 });
});
