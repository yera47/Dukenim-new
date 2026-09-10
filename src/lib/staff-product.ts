import {z} from "zod";
export const staffProductSchema=z.object({access:z.string().uuid(),request:z.string().uuid(),title:z.string().trim().min(2).max(200),description:z.string().trim().max(4000),price:z.coerce.number().int().min(0).max(2000000000),stock:z.coerce.number().int().min(0).max(1000000)});
