import {describe,it,expect} from "vitest";
import {customSalesPeriod} from "./custom-sales-period";
describe("custom reporting period",()=>{
 it("includes both dates in Kazakhstan time",()=>{expect(customSalesPeriod("2026-09-01","2026-09-02")).toEqual({start:"2026-08-31T19:00:00.000Z",end:"2026-09-02T18:59:59.999Z",labels:["2026-09-01","2026-09-02"]});});
 it("rejects invalid or reversed dates",()=>{for(const pair of [["2026-02-30","2026-03-01"],["2026-09-02","2026-09-01"],["x","y"]])expect(()=>customSalesPeriod(...pair as [string,string])).toThrow();});
 it("allows a leap day",()=>expect(customSalesPeriod("2024-02-29","2024-02-29").labels).toEqual(["2024-02-29"]));
});
