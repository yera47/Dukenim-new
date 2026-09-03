import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/queries/owner";
import { getPolarClient, isPolarConfigured } from "@/lib/polar";

// Redirects the owner to the Polar-hosted customer portal (invoices, payment method,
// cancellation). Fails closed to /admin/plan with an honest reason instead of a 500 or a
// fake portal page — there are no secrets to leak in either branch.
export async function GET(request: Request) {
  const target = new URL("/admin/plan", request.url);
  try {
    const { tenantId } = await requireRole(["owner", "superadmin"]);
    if (!tenantId || !isPolarConfigured()) {
      target.searchParams.set("portal", "unavailable");
      return NextResponse.redirect(target);
    }
    const { data: tenant } = await getTenant(await createClient(), tenantId);
    if (!tenant?.polar_customer_id) {
      target.searchParams.set("portal", "no_subscription");
      return NextResponse.redirect(target);
    }
    const polar = getPolarClient();
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
    const session = await polar.customerSessions.create({ customerId: tenant.polar_customer_id, returnUrl: `${siteUrl}/admin/plan` });
    return NextResponse.redirect(session.customerPortalUrl);
  } catch {
    target.searchParams.set("portal", "unavailable");
    return NextResponse.redirect(target);
  }
}
