import {describe,it,expect} from "vitest";
import {readGuestOrders,signGuestOrders} from "./guest-orders";
const order={id:"11111111-1111-4111-8111-111111111111",tenant:"22222222-2222-4222-8222-222222222222",expires:100};
describe("guest order receipt",()=>{
 it("accepts only signed, unexpired receipts",()=>{const value=signGuestOrders([order],"test-key");expect(readGuestOrders(value,"test-key",1)).toEqual([order]);expect(readGuestOrders(value,"test-key",101)).toEqual([]);expect(readGuestOrders(value,"wrong-key",1)).toEqual([]);});
 it("rejects tampering and malformed values",()=>{const value=signGuestOrders([order],"key");for(const bad of [value+".extra",value.replace(".","x."),"{}","a.b",undefined])expect(readGuestOrders(bad,"key",1)).toEqual([]);});
});
