import { z } from "zod";

export const aiStudioIntentSchema = z.enum(["hero", "promotion", "catalog_copy", "catalog_structure", "banner"]);
export type AiStudioIntent = z.infer<typeof aiStudioIntentSchema>;

// Draft engineering defaults (src/lib/plans.ts documents the same caveat for the monthly
// allotment they are spent against): confirm real Azure/image-model cost before treating these
// as final. A banner costs far more than a text draft because it calls a separate image model.
export const aiCreditCost: Record<AiStudioIntent, number> = {
  hero: 1,
  promotion: 1,
  catalog_copy: 1,
  catalog_structure: 2,
  banner: 20,
};

// Best-effort keyword guard, not real moderation: catches the obvious "generate this exact
// garment/product photo" requests so the banner intent stays a promotional-graphic tool and
// never becomes an ad-hoc product-photography generator. A determined user can still phrase
// around it — the system prompt in studio.ts is the second, stronger layer of the same constraint.
const BANNED_BANNER_TERMS = /(одежд|платье|футболк|рубашк|куртк|пальто|костюм|брюк|джинс|юбк|шапк|кроссовк|туфл|ботинк|обувь|сумк[аиу]|dress|shirt|jacket|shoes|sneaker|handbag|clothing|apparel)/i;

export class BannerBriefRejected extends Error {}

export function guardBannerBrief(brief: string) {
  if (BANNED_BANNER_TERMS.test(brief)) {
    throw new BannerBriefRejected("Баннер — это только рекламная графика, без конкретной одежды или товара на фото. Опишите акцию или сообщение, а не конкретную вещь.");
  }
}
