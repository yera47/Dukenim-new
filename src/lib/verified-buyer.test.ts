import {describe,expect,it} from "vitest";
import type {User} from "@supabase/supabase-js";
import {verifiedBuyer} from "./verified-buyer";

const account=(value:Partial<User>)=>value as User;

describe("buyer account eligibility",()=>{
  it("accepts a confirmed email for account history without treating its phone as verified",()=>{
    expect(verifiedBuyer(account({email:"buyer@example.test",email_confirmed_at:"2026-09-21T00:00:00Z",phone:"+77000000000"}))).toEqual({accountVerified:true,phoneVerified:false});
  });
  it("keeps an unconfirmed or anonymous account on browser-only history",()=>{
    expect(verifiedBuyer(account({email:"buyer@example.test"})).accountVerified).toBe(false);
    expect(verifiedBuyer(account({email:"buyer@example.test",email_confirmed_at:"2026-09-21T00:00:00Z",is_anonymous:true})).accountVerified).toBe(false);
  });
  it("accepts confirmed phone identity",()=>{
    expect(verifiedBuyer(account({phone:"+77000000000",phone_confirmed_at:"2026-09-21T00:00:00Z"}))).toEqual({accountVerified:true,phoneVerified:true});
  });
});
