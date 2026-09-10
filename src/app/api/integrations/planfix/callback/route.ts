import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangePlanfixAuthorizationCode } from "@/lib/integrations/planfix";
import { openPlanfixOAuthState, PLANFIX_OAUTH_COOKIE_NAME } from "@/lib/integrations/oauth-state";
import { encryptIntegrationSecret } from "@/lib/integrations/secrets";

function config() {
  const clientId = process.env.PLANFIX_CLIENT_ID?.trim();
  const clientSecret = process.env.PLANFIX_CLIENT_SECRET?.trim();
  const redirectUri = process.env.PLANFIX_REDIRECT_URI?.trim();
  const encryptionKey = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim();
  if (!clientId || !clientSecret || !redirectUri || !encryptionKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Planfix OAuth is not configured");
  }
  return { clientId, clientSecret, redirectUri, encryptionKey };
}

function resultRedirect(redirectUri: string, result: string) {
  const destination = new URL("/admin/integrations", redirectUri);
  destination.searchParams.set("planfix", result);
  const response = NextResponse.redirect(destination);
  response.cookies.set(PLANFIX_OAUTH_COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/integrations/planfix", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  let redirectUri = process.env.PLANFIX_REDIRECT_URI?.trim() || "https://www.dukenim.kz/api/integrations/planfix/callback";
  try {
    const configured = config();
    redirectUri = configured.redirectUri;
    const code = request.nextUrl.searchParams.get("code") ?? "";
    const state = request.nextUrl.searchParams.get("state") ?? "";
    if (!state) return resultRedirect(redirectUri, "invalid");

    const context = await getSessionContext();
    if (!context?.user || context.role !== "owner" || !context.tenantId) return resultRedirect(redirectUri, "session");
    const cookieValue = (await cookies()).get(PLANFIX_OAUTH_COOKIE_NAME)?.value;
    if (!cookieValue) return resultRedirect(redirectUri, "state");
    const oauthState = openPlanfixOAuthState(cookieValue, { state, userId: context.user.id }, configured.encryptionKey);
    if (oauthState.tenantId !== context.tenantId) return resultRedirect(redirectUri, "state");
    if (request.nextUrl.searchParams.get("error")) return resultRedirect(redirectUri, "denied");
    if (!code) return resultRedirect(redirectUri, "invalid");

    const tokens = await exchangePlanfixAuthorizationCode({
      clientId: configured.clientId,
      clientSecret: configured.clientSecret,
      code,
      redirectUri,
      verifier: oauthState.verifier,
    });
    const now = new Date();
    const accountUrl = `https://${tokens.accountDomain}`;
    const admin = createAdminClient();
    const { data: connection, error: connectionError } = await admin.from("integration_connections").upsert({
      tenant_id: context.tenantId,
      provider: "planfix",
      account_name: tokens.accountName || null,
      account_domain: tokens.accountDomain,
      account_url: accountUrl,
      scopes: tokens.scope.split(/\s+/).filter(Boolean),
      token_ciphertext: encryptIntegrationSecret({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, configured.encryptionKey),
      access_token_expires_at: new Date(now.getTime() + tokens.expiresIn * 1000).toISOString(),
      connected_by: context.user.id,
      connected_at: now.toISOString(),
      status: "active",
      safe_error: null,
      updated_at: now.toISOString(),
    }, { onConflict: "tenant_id,provider" }).select("id").single();
    if (connectionError || !connection) throw new Error("Could not persist Planfix connection");

    const { error: requestError } = await admin.from("crm_integration_requests").upsert({
      tenant_id: context.tenantId,
      provider: "planfix",
      account_url: accountUrl,
      admin_contact: context.user.email ?? null,
      sync_direction: "orders_and_customers",
      status: "connected",
      preflight_summary: "Planfix OAuth подключён. Синхронизация заказов включается после отдельного теста.",
      safe_error: null,
      secret_reference: connection.id,
      last_status_at: now.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: "tenant_id,provider" });
    if (requestError) throw new Error("Could not update integration status");
    return resultRedirect(redirectUri, "connected");
  } catch {
    return resultRedirect(redirectUri, "failed");
  }
}
