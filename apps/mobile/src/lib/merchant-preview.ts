import type { OwnerStore } from "./owner";
import type { StudioReadiness } from "./studio-next-step";
import demoBrandAssets from "../../../../shared/demo-brand-assets.json";

export const merchantPreviewStore: OwnerStore = {
  id: "preview-red-chocoberry",
  name: "Rose Studio",
  slug: "rose-studio-preview",
  business_vertical: "flowers",
  catalog_published: true,
  onboarding_completed: true,
  catalog_status: "ready",
  next_plan: "standard",
  preferred_billing_period: "monthly",
  status: "trial",
  trial_ends_at: "2026-10-09T00:00:00.000Z",
  logo_url: demoBrandAssets.roseStudio,
  accent_color: "#8B2D55",
  brand_profile:{brand_color:"#9B315D",color_theme:{background:"#FFF8F3",surface:"#FFFDF9",accent:"#9B315D"},layout_config:{typography:"editorial",corners:"rounded"}},
};

export const bulkaMerchantPreviewStore:OwnerStore={
  ...merchantPreviewStore,id:"preview-bulka",name:"Bulka",slug:"bulka-preview",business_vertical:"food",logo_url:demoBrandAssets.bulka,accent_color:"#F59B14",brand_profile:{brand_color:"#F59B14",color_theme:{background:"#FFF7E8",surface:"#FFFCF5",accent:"#F59B14"},layout_config:{typography:"modern",corners:"rounded"}},
};

export const merchantPreviewImages = [
  "https://d8j0ntlcm91z4.cloudfront.net/user_3IiQlgoGNOZecy2pHManEfSn5Xj/hf_20260907_122409_bd8f8808-0570-4504-8ad0-b52f4a338274.png",
  "https://d8j0ntlcm91z4.cloudfront.net/user_3IiQlgoGNOZecy2pHManEfSn5Xj/hf_20260907_122409_32afa9f2-69c3-4f6a-825a-c89d450bd5ca.png",
] as const;

export const bulkaMerchantPreviewImages = [
  "https://d8j0ntlcm91z4.cloudfront.net/user_3IiQlgoGNOZecy2pHManEfSn5Xj/hf_20260906_215334_3accd292-1f19-4b05-aa3b-03f5c03fc8ba.png",
] as const;

export const merchantPreviewReadiness: StudioReadiness = {
  products: 12,
  stockedProducts: 10,
  newOrders: 2,
  pickupEnabled: true,
  deliveryEnabled: true,
  pickupAddress: "Демо-адрес",
};
