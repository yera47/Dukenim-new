import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getProfileRole, getUserTenant } from "@/lib/queries/auth";
import { getTenant } from "@/lib/queries/owner";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const client = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: profile } = await getProfileRole(client, user.id);
  if (request.nextUrl.pathname.startsWith("/root") && profile?.role !== "superadmin") return NextResponse.redirect(new URL("/admin", request.url));
  if (request.nextUrl.pathname.startsWith("/admin") && !["owner", "superadmin"].includes(profile?.role ?? "")) return NextResponse.redirect(new URL("/login", request.url));

  if (profile?.role === "owner") {
    const { data: membership } = await getUserTenant(client, user.id);
    if (membership) {
      const { data: tenant } = await getTenant(client, membership.tenant_id);
      const onOnboarding = request.nextUrl.pathname.startsWith("/onboarding");

      // Older production databases may not have onboarding_completed yet.
      // Only an explicit false should block the cabinet route.
      if (tenant?.onboarding_completed === false && !onOnboarding) return NextResponse.redirect(new URL("/onboarding", request.url));
      if (tenant?.onboarding_completed === true && onOnboarding) return NextResponse.redirect(new URL("/admin", request.url));

      const expired = tenant?.status === "trial" && tenant.trial_ends_at && new Date(tenant.trial_ends_at).getTime() <= Date.now();
      if (expired && !request.nextUrl.pathname.startsWith("/admin/plan")) {
        const target = new URL("/admin/plan", request.url);
        target.searchParams.set("expired", "1");
        return NextResponse.redirect(target);
      }

      const restricted = ["/admin/stock", "/admin/analytics", "/admin/customers"];
      if (tenant?.status !== "trial" && tenant?.plan === "basic" && restricted.some(path => request.nextUrl.pathname.startsWith(path))) {
        const target = new URL("/admin/plan", request.url);
        target.searchParams.set("locked", "standard");
        return NextResponse.redirect(target);
      }
    }
  }

  return response;
}

export const config = { matcher: ["/admin/:path*", "/root/:path*", "/onboarding/:path*"] };
