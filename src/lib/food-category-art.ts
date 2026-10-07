/**
 * Contract for future generated category art.
 *
 * Category artwork is intentionally separate from product photography: the
 * storefront must never reuse an SKU photo or emoji as a category illustration.
 * Azure Studio may populate these tenant-scoped slots after a merchant accepts
 * an output. Until then the category-art rail stays hidden.
 */
export type FoodCategoryArtSlot = {
  tenantId: string;
  category: string;
  assetUrl: string | null;
  alt: string;
  status: "empty" | "draft" | "accepted";
};

export function acceptedFoodCategoryArt(slots: FoodCategoryArtSlot[]) {
  return slots.filter((slot) => slot.status === "accepted" && Boolean(slot.assetUrl));
}
