import { z } from "zod";
import { customStoreThemeSchema } from "../custom-store-theme";

export const aiStudioDraftSchema = z.object({
  eyebrow: z.string().trim().max(48).optional(),
  title: z.string().trim().min(2).max(90),
  body: z.string().trim().min(2).max(280),
  ctaLabel: z.string().trim().min(2).max(36),
});

export type AiStudioDraft = z.infer<typeof aiStudioDraftSchema>;

export const aiStudioDesignSchema = z.object({
  sections: z.array(z.object({name:z.string().trim().min(2).max(40)}).strict()).min(2).max(6).optional(),
  colorTheme: customStoreThemeSchema.optional(),
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  templateKey: z.enum(["atelier", "studio", "market", "journal", "gallery", "signature"]),
  paletteKey: z.enum(["mono", "ink-brass", "paper-forest", "clay-milk", "ocean-sand", "plum-stone", "cobalt-cloud", "olive-linen", "cherry-cream", "terra-charcoal", "mint-charcoal", "rose-ink", "sunset-navy"]),
  heroTitle: z.string().trim().min(2).max(90),
  heroSubtitle: z.string().trim().min(2).max(180),
  heroCtaLabel: z.string().trim().min(2).max(36),
  // Rationale is explanatory UI copy, not a capability or commercial condition.
  // A verbose explanation must not discard an otherwise valid model proposal.
  rationale: z.string().trim().min(2).max(4000).transform(value=>value.slice(0,240)),
});

export type AiStudioDesign = z.infer<typeof aiStudioDesignSchema>;
