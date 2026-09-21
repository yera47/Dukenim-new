import {describe,expect,it} from "vitest";
import {kaspiRemoteUrl} from "./kaspi-remote";
describe("Kaspi remote link",()=>{
 it("accepts only Kaspi HTTPS links",()=>{
  expect(kaspiRemoteUrl("https://pay.kaspi.kz/pay/example")).toBe("https://pay.kaspi.kz/pay/example");
  expect(kaspiRemoteUrl("https://kaspi.kz/pay/example")).toBe("https://kaspi.kz/pay/example");
 });
 it("rejects lookalike hosts and credentials",()=>{
  for(const value of ["https://kaspi.kz.evil.test/pay","https://evil.test/?to=kaspi.kz","https://user@kaspi.kz/pay","https://kaspi.kz:4444/pay","http://kaspi.kz/pay","javascript:alert(1)"]){
   expect(kaspiRemoteUrl(value)).toBeNull();
  }
 });
});
