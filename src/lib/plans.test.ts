import {describe,expect,it} from "vitest";
import {planFeatures,planName,planPrice,publicPlans} from "./plans";

describe("public plan contract",()=>{
  it("publishes only Base and Premium at the owner-approved draft prices",()=>{
    expect(publicPlans).toEqual(["basic","standard"]);
    expect(planName.basic).toBe("Base");
    expect(planName.standard).toBe("Premium");
    expect(planPrice.basic).toBe(25_000);
    expect(planPrice.standard).toBe(35_000);
  });

  it("keeps AI out of Base and describes Premium AI as credit based",()=>{
    expect(planFeatures.basic.join(" ")).toMatch(/без AI-генерации/i);
    expect(planFeatures.standard.join(" ")).toMatch(/product credits/i);
  });
});
