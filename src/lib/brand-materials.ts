import { z } from "zod";
export const brandNotesSchema=z.object({revision:z.number().int().min(0).max(2147483646),notes:z.string().trim().max(6000)}).strict();
export const brandColorsSchema=z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).max(6);
