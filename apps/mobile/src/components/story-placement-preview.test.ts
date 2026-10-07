import {describe,expect,it} from "vitest";
import {mobileApproachForTemplate} from "../lib/story-placement";

describe("mobile story placement",()=>{
  it.each([
    ["atelier","collection"],["journal","collection"],["gallery","collection"],
    ["market","assortment"],["studio","guided"],["signature","guided"],
  ] as const)("maps %s to %s",(template,approach)=>expect(mobileApproachForTemplate(template)).toBe(approach));
});
