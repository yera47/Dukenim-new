import { z } from "zod";

// Deliberately declarative: model output can never execute CSS, HTML or scripts.
export const personalStoreLayoutSchema = z.object({
  typography: z.enum(["modern", "editorial", "technical"]),
  hero: z.enum(["editorial", "compact", "centered"]),
  density: z.enum(["airy", "balanced", "compact"]),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  corners: z.enum(["square", "soft", "rounded"]),
  imageRatio: z.enum(["portrait", "square", "landscape"]),
}).strict();

export function personalStoreLayout(value: unknown) {
  const parsed = personalStoreLayoutSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
