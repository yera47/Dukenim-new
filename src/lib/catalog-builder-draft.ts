import { z } from "zod";
import { palettes, templateCatalog } from "./storefront-theme";

export const catalogBuilderStateSchema = z.object({
  step: z.number().int().min(0).max(2),
  designStage: z.enum(["brief", "colors", "examples"]).optional(),
  colorBrief: z.string().max(300).optional(),
  catalogName: z.string().max(80),
  templateKey: z.string().refine(key => templateCatalog.some(t => t.key === key)),
  paletteKey: z.string().refine(key => palettes.some(p => p.key === key)),
  brief: z.string().max(650),
  generationId: z.string().uuid().optional(),
}).strict();
export const catalogBuilderSaveSchema = z.object({
  revision: z.number().int().min(0).max(2147483646),
  state: catalogBuilderStateSchema,
}).strict();
export type CatalogBuilderState = z.infer<typeof catalogBuilderStateSchema>;
