import {describe,it,expect} from "vitest";
import {expoAccepted} from "./expo-push-result";
describe("Expo transport acknowledgement",()=>{
  it("rejects empty, partial and malformed acknowledgements",()=>{
    expect(expoAccepted({data:[]},1)).toBe(false);
    expect(expoAccepted({data:[{status:"ok"}]},1)).toBe(false);
    expect(expoAccepted({data:[{status:"ok",id:"ticket"}]},2)).toBe(false);
    expect(expoAccepted({data:[{status:"error",id:"ticket"}]},1)).toBe(false);
  });
  it("accepts complete transport tickets, not proof of device delivery",()=>expect(expoAccepted({data:[{status:"ok",id:"ticket"}]},1)).toBe(true));
});
