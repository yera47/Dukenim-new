import { expect,it } from "vitest";
import { commerceConfigurations,configurationFor } from "./commerce-configurations";
import { launchVerticals } from "./launch-verticals";
it("has 18 unique supported configurations, three per business",()=>{
 expect(commerceConfigurations).toHaveLength(18);
 expect(new Set(commerceConfigurations.map(c=>c.href)).size).toBe(18);
 for(const vertical of launchVerticals)expect(commerceConfigurations.filter(c=>c.vertical===vertical.id)).toHaveLength(3);
 expect(configurationFor("services","guided")).toBeUndefined();
 expect(configurationFor("food","unknown")).toBeUndefined();
});
