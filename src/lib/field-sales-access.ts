import type { AppRole } from "@/lib/auth";

export const FIELD_SALES_TENANT_ID = "447ca12a-e09c-4b2d-b4fb-9be2e4e91866";
export const FIELD_SALES_TENANT_SLUG = "dukenim-9b139";

export function canUseFieldSales(role: AppRole, tenantId: string | null) {
  return role === "superadmin" || (role === "owner" && tenantId === FIELD_SALES_TENANT_ID);
}
