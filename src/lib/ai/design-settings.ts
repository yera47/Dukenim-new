import type { AiStudioDesign } from "./studio-schemas";
export function proposedDesignSettings(design:AiStudioDesign,current:{brand_color:string|null;hero_image_url:string|null}|null) {
  return {template_key:design.templateKey,palette_key:design.paletteKey,brand_color:design.brandColor??current?.brand_color??null,
    hero_title:design.heroTitle,hero_subtitle:design.heroSubtitle,hero_image_url:current?.hero_image_url??null,hero_cta_label:design.heroCtaLabel};
}
