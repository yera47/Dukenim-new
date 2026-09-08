import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getProfileRole, getUserTenant } from "@/lib/queries/auth";
import { getTenant } from "@/lib/queries/owner";
import { computeEntitlement } from "@/lib/entitlement";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return new NextResponse("Сервис временно недоступен", { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }

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

  const redirect = (target: URL) => {
    const redirected = NextResponse.redirect(target);
    redirected.headers.set("Cache-Control", "private, no-store");
    response.cookies.getAll().forEach(cookie => redirected.cookies.set(cookie));
    return redirected;
  };

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return redirect(new URL("/login", request.url));

  const { data: profile } = await getProfileRole(client, user.id);
  if (request.nextUrl.pathname.startsWith("/root") && profile?.role !== "superadmin") return redirect(new URL("/admin", request.url));
  if (request.nextUrl.pathname.startsWith("/admin") && !["owner", "superadmin"].includes(profile?.role ?? "")) return redirect(new URL("/login", request.url));

  if (profile?.role === "owner") {
    const { data: membership } = await getUserTenant(client, user.id);
    if (membership) {
      const { data: tenant } = await getTenant(client, membership.tenant_id);
      const onOnboarding = request.nextUrl.pathname.startsWith("/onboarding");

      // Older production databases may not have onboarding_completed yet.
      // Only an explicit false should block the cabinet route.
      if (tenant?.onboarding_completed === false && !onOnboarding) return redirect(new URL("/onboarding", request.url));
      if (tenant?.onboarding_completed === true && onOnboarding) return redirect(new URL("/admin", request.url));

      const entitlement = tenant ? computeEntitlement(tenant) : null;
      if (entitlement && !entitlement.active && !request.nextUrl.pathname.startsWith("/admin/plan")) {
        const target = new URL("/admin/plan", request.url);
        target.searchParams.set("expired", "1");
        return redirect(target);
      }

      const restricted = ["/admin/stock", "/admin/analytics", "/admin/customers"];
      if (entitlement?.active && entitlement.plan === "basic" && restricted.some(path => request.nextUrl.pathname.startsWith(path))) {
        const target = new URL("/admin/plan", request.url);
        target.searchParams.set("locked", "standard");
        return redirect(target);
      }
    }
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/admin/:path*", "/root/:path*", "/onboarding/:path*", "/store-preview/:path*"] };
