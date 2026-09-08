import { z } from "zod";

const amount = z.number().int().min(0).max(2_000_000_000);
export const deliveryZoneSchema = z.object({
  name: z.string().trim().min(2).max(100),
  cost: amount,
  free_from: amount.nullable(),
  eta_text: z.string().trim().max(200).nullable(),
  is_active: z.boolean(),
});

export function parseDeliveryZone(form: FormData) {
  const cost = String(form.get("cost") ?? "").trim();
  const free = String(form.get("freeFrom") ?? "").trim();
  return deliveryZoneSchema.safeParse({
    name: form.get("name"), cost: cost ? Number(cost) : NaN,
    free_from: free ? Number(free) : null,
    eta_text: String(form.get("etaText") ?? "").trim() || null,
    is_active: form.get("active") === "on",
  });
}
