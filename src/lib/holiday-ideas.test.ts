import {describe,expect,it} from "vitest";
import {nextHolidayIdeas} from "./holiday-ideas";
describe("holiday suggestions",()=>{
 it("appears seven days before the event and rolls to the next year",()=>{
  expect(nextHolidayIdeas(new Date(2026,9,24)).find(item=>item.key==="halloween")?.daysUntil).toBe(7);
  expect(nextHolidayIdeas(new Date(2026,10,1)).some(item=>item.key==="halloween")).toBe(false);
  expect(nextHolidayIdeas(new Date(2026,11,28)).find(item=>item.key==="new-year")?.year).toBe(2027);
 });
});
