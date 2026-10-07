export const storeArchiveEnabled = (value = process.env.ENABLE_STORE_ARCHIVE) => value === "true";

export const ACTIVE_STORE_COLUMNS = "id,name,slug,business_vertical,onboarding_completed,catalog_published,status" as const;
export const ARCHIVE_STORE_COLUMNS = `${ACTIVE_STORE_COLUMNS},archived_at,archive_reason` as const;
