import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/queries/owner";
import { computeEntitlement } from "@/lib/entitlement";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { role, tenantId } = await requireRole(["owner", "superadmin"]);
  const tenant = !process.env.NEXT_PUBLIC_SUPABASE_URL
    ? {
        name: "Серик Шоп",
        slug: "demo-shop",
        plan: "standard" as const,
        next_plan: "standard" as const,
        status: "trial" as const,
        trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      }
    : (await getTenant(await createClient(), tenantId!)).data;

  if (!tenant) return null;
  const entitlement = computeEntitlement(tenant);

  return (
    <AdminShell
      role={role as "owner" | "superadmin"}
      tenant={{
        name: tenant.name,
        slug: tenant.slug,
        plan: entitlement.plan,
        status: tenant.status,
        trialEndsAt: tenant.trial_ends_at,
      }}
    >
      {children}
    </AdminShell>
  );
}
