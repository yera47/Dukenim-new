import { z } from "zod";
export const consultationSchema = z.object({
  reply: z.string().trim().min(1).max(1800),
  task: z.object({
    intent: z.enum(["hero","store_design","catalog_structure","promotion"]),
    brief: z.string().trim().min(8).max(800),
  }).strict().nullable(),
}).strict();
export type Consultation = z.infer<typeof consultationSchema>;
export type ConsultationTurn = { id:string; message:string; response:Consultation };
