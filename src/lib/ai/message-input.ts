import {z} from "zod";
const text=z.string().trim().min(1).max(12000);
const contentPart=z.discriminatedUnion("type",[
  z.object({type:z.literal("text"),text}),
  z.object({type:z.literal("image_url"),image_url:z.object({url:z.string().max(1500000).regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/)})}),
]);
export const azureMessageSchema=z.union([
  z.object({role:z.enum(["system","user","assistant"]),content:text}),
  z.object({role:z.literal("user"),content:z.array(contentPart).min(2).max(2).refine(parts=>parts.filter(p=>p.type==="text").length===1&&parts.filter(p=>p.type==="image_url").length===1)}),
]);
export type AzureFoundryMessage=z.infer<typeof azureMessageSchema>;
