import {describe,it,expect} from "vitest";
import {staffProductSchema} from "./staff-product";
const value={access:"123e4567-e89b-42d3-a456-426614174000",request:"123e4567-e89b-42d3-a456-426614174001",title:"Серик товар",description:"",price:"1200",stock:"2"};
describe("staff product input",()=>{
 it("accepts integer KZT and stock",()=>expect(staffProductSchema.parse(value).price).toBe(1200));
 it("rejects fractional price and stock",()=>{expect(staffProductSchema.safeParse({...value,price:"1.5"}).success).toBe(false);expect(staffProductSchema.safeParse({...value,stock:"-1"}).success).toBe(false);});
 it("bounds content and requires scoped IDs",()=>{expect(staffProductSchema.safeParse({...value,access:"other"}).success).toBe(false);expect(staffProductSchema.safeParse({...value,description:"x".repeat(4001)}).success).toBe(false);});
});
