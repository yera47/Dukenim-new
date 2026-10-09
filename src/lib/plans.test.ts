import {describe,expect,it} from "vitest";
import {planFeatures,planName,planPrice,publicPlans} from "./plans";

describe("public plan contract",()=>{
  it("publishes the owner-approved single monthly Catalog plan",()=>{
    expect(publicPlans).toEqual(["basic"]);
    expect(planName.basic).toBe("Каталог");
    expect(planName.standard).toBe("Каталог");
    expect(planPrice.basic).toBe(24_900);
    expect(planPrice.standard).toBe(24_900);
  });

  it("keeps legacy plan rows feature-equivalent",()=>{
    expect(planFeatures.basic.join(" ")).toMatch(/AI-помощник/i);
    expect(planFeatures.basic).toContain("Команда, аналитика, интеграции и выездные продажи");
    expect(planFeatures.standard.join(" ")).toMatch(/Все функции тарифа/);
  });
});
