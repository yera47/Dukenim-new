import { z } from "zod";

export const aiStudioDraftSchema = z.object({
  eyebrow: z.string().trim().max(48).optional(),
  title: z.string().trim().min(2).max(90),
  body: z.string().trim().min(2).max(280),
  ctaLabel: z.string().trim().min(2).max(36),
});

export type AiStudioDraft = z.infer<typeof aiStudioDraftSchema>;

export const aiStudioDesignSchema = z.object({
  templateKey: z.enum(["atelier", "studio", "market", "journal", "gallery", "signature"]),
  paletteKey: z.enum(["mono", "ink-brass", "paper-forest", "clay-milk", "ocean-sand", "plum-stone", "cobalt-cloud", "olive-linen", "cherry-cream", "terra-charcoal", "mint-charcoal", "rose-ink", "sunset-navy"]),
  heroTitle: z.string().trim().min(2).max(90),
  heroSubtitle: z.string().trim().min(2).max(180),
  heroCtaLabel: z.string().trim().min(2).max(36),
  rationale: z.string().trim().min(2).max(240),
});

export type AiStudioDesign = z.infer<typeof aiStudioDesignSchema>;
