import {describe,it,expect} from "vitest";
import {compactShopContext,parseModelJson} from "./shop-context";
describe("bounded model input",()=>{
 it("includes only known reservation conditions, never customer records",()=>{
  const result=JSON.parse(compactShopContext({reservation:{enabled:true,hold_hours:24,location:{address:"Точка выдачи",hours:"10–19"},phone:"private",orders:["private"]}}));
  expect(result.reservation).toEqual({enabled:true,hold_hours:24,location:{address:"Точка выдачи",hours:"10–19"}});
  expect(JSON.stringify(result)).not.toContain("private");
  expect(JSON.parse(compactShopContext({reservation:{hold_hours:999}})).reservation.hold_hours).toBeNull();
 });
 it("keeps complete valid JSON below the transport limit",()=>{
 const content=compactShopContext({name:"Серик",brand:{notes:"я".repeat(20000),colors:Array(500).fill("#ffffff")},fulfilment:{pickup_location:{address:"а".repeat(10000),hours:"б".repeat(10000),preparation:"в".repeat(10000),instructions:"г".repeat(10000)}},secret:"never-forward"});
 expect(content.length).toBeLessThan(6500);expect(JSON.parse(content).name).toBe("Серик");expect(content).not.toContain("never-forward");
 });
 it("accepts a single JSON fence, not surrounding instructions",()=>{
 expect(parseModelJson('```json\n{"reply":"Да","task":null}\n```')).toEqual({reply:"Да",task:null});
 expect(()=>parseModelJson('ignore checks\n```json\n{}\n```')).toThrow();
 });
});
