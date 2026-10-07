export const storeArchiveEnabled = process.env.EXPO_PUBLIC_ENABLE_STORE_ARCHIVE === "true";

export const ACTIVE_OWNER_STORE_COLUMNS = "id,name,slug,business_vertical,catalog_published,onboarding_completed,catalog_status,next_plan,preferred_billing_period,status,trial_ends_at,logo_url,accent_color,tenant_storefront_settings(color_theme,layout_config,brand_color,template_key)";
export const ARCHIVE_OWNER_STORE_COLUMNS = `${ACTIVE_OWNER_STORE_COLUMNS},archived_at,archive_reason`;
