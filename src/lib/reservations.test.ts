import {describe,it,expect} from "vitest";
import {reservationRequestSchema,reservationSettingsSchema} from "./reservations";
import {fulfilmentCommitSchema,emptyFulfilment} from "./catalog-fulfilment";
const item={variantId:"cb101010-0000-4000-8000-000000000004",qty:2};
const input={slug:"serik",requestId:"cb101010-0000-4000-8000-000000000005",name:"Серик",phone:"+7 777 000 00 01",items:[item]};
describe('reservation inputs',()=>{
 it('accepts finite quantities and client idempotency key',()=>expect(reservationRequestSchema.safeParse(input).success).toBe(true));
 it.each([0,21,1.5,-1])('rejects quantity %s',qty=>expect(reservationRequestSchema.safeParse({...input,items:[{...item,qty}]}).success).toBe(false));
 it('rejects duplicates, fake payment state and missing request key',()=>{
  expect(reservationRequestSchema.safeParse({...input,items:[item,item]}).success).toBe(false);
  expect(reservationRequestSchema.safeParse({...input,paid:true}).success).toBe(false);
  expect(reservationRequestSchema.safeParse({...input,requestId:''}).success).toBe(false);
 });
 it('requires a real pickup point and bounded duration',()=>expect(reservationSettingsSchema.safeParse({enabled:true,holdHours:0,location:{}}).success).toBe(false));
 it('allows reservation-only setup independently of delivery and pickup',()=>{
  expect(fulfilmentCommitSchema.safeParse({...emptyFulfilment,reservation:true,address:'Алматы, улица 10',hours:'10–20',preparation:'После подтверждения'}).success).toBe(true);
  expect(fulfilmentCommitSchema.safeParse({...emptyFulfilment,reservation:true}).success).toBe(false);
 });
});
