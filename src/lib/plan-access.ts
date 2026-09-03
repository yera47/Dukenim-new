import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/queries/owner";
import { hasPlan, type Plan } from "@/lib/plans";
import { computeEntitlement, type TenantEntitlement } from "@/lib/entitlement";

export type { TenantEntitlement };

export async function tenantEntitlement(tenantId: string): Promise<TenantEntitlement> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { active: true, plan: "standard", trialActive: true, expired: false };
  const { data } = await getTenant(await createClient(), tenantId);
  if (!data) return { active: false, plan: "basic", trialActive: false, expired: false };
  return computeEntitlement(data);
}

export async function tenantHasPlan(tenantId: string, required: Plan) {
  const entitlement = await tenantEntitlement(tenantId);
  return entitlement.active && hasPlan(entitlement.plan, required);
}
