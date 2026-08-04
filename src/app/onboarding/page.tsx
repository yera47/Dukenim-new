import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/queries/owner";
import type { Plan } from "@/lib/plans";
import { OnboardingFlow } from "./onboarding-flow";
type TenantIntro = { name: string; slug: string; trial_ends_at: string; next_plan: Plan };
export default async function OnboardingPage() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  let tenant: TenantIntro = { name: "Ваш магазин", slug: "your-store", trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(), next_plan: "standard" };
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && tenantId) { const found = (await getTenant(await createClient(), tenantId)).data; if (found) tenant = { name: found.name, slug: found.slug, trial_ends_at: found.trial_ends_at ?? tenant.trial_ends_at, next_plan: found.next_plan ?? "standard" }; }
  return <OnboardingFlow tenant={tenant}/>;
}
