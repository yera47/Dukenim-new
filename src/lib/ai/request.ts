import { z } from "zod";

export const aiRequestSubjects = {
  payments: "Подключение оплаты картой",
  kaspi: "Подключение Kaspi Pay",
  integrations: "Подключение CRM",
  support: "Помощь по магазину",
} as const;
export const aiRequestSchema = z.object({
  generationId: z.string().uuid(),
  kind: z.enum(["payments", "kaspi", "integrations", "support"]),
  text: z.string().trim().min(2).max(3000),
});
