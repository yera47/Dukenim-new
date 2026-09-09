import { expect,it } from "vitest";
import { emptyFulfilment, fulfilmentDraftSchema, fulfilmentCommitSchema, paymentPreferenceSchema } from "./catalog-fulfilment";
it("saves incomplete answers but does not commit no receiving method",()=>{
 expect(fulfilmentDraftSchema.safeParse(emptyFulfilment).success).toBe(true);
 expect(fulfilmentCommitSchema.safeParse(emptyFulfilment).success).toBe(false);
});
it("requires a valid delivery price, zone and actual time",()=>{
 const value={...emptyFulfilment,delivery:true,zone:"Алматы",cost:"1500",eta:"На следующий день"};
 expect(fulfilmentCommitSchema.safeParse(value).success).toBe(true);
 for(const cost of ["","-1","1.5","2e4","2000000001"])expect(fulfilmentCommitSchema.safeParse({...value,cost}).success).toBe(false);
});
it("requires pickup address, schedule and map host validation",()=>{
 const value={...emptyFulfilment,pickup:true,address:"Алматы, улица 10",hours:"10–20",preparation:"Через 2 часа",gisUrl:"https://2gis.kz/almaty"};
 expect(fulfilmentCommitSchema.safeParse(value).success).toBe(true);
 expect(fulfilmentCommitSchema.safeParse({...value,gisUrl:"https://evil.test/"}).success).toBe(false);
 expect(fulfilmentCommitSchema.safeParse({...value,preparation:""}).success).toBe(false);
});
it("accepts deferral, never a client-supplied payment activation",()=>{
 expect(paymentPreferenceSchema.parse("later")).toBe("later");
 expect(paymentPreferenceSchema.safeParse("paid").success).toBe(false);
});
