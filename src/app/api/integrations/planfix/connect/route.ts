import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { buildPlanfixAuthorizationUrl, createPlanfixPkcePair } from "@/lib/integrations/planfix";
import { createPlanfixOAuthState, PLANFIX_OAUTH_COOKIE_NAME, PLANFIX_OAUTH_MAX_AGE_SECONDS, planfixOAuthCookieDomain, sealPlanfixOAuthState } from "@/lib/integrations/oauth-state";

function config() {
  const clientId = process.env.PLANFIX_CLIENT_ID?.trim();
  const redirectUri = process.env.PLANFIX_REDIRECT_URI?.trim();
  const encryptionKey = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim();
  if (!clientId || !redirectUri || !encryptionKey) throw new Error("Planfix OAuth is not configured");
  return { clientId, redirectUri, encryptionKey };
}

export async function GET() {
  const context = await getSessionContext();
  if (!context?.user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  if (context.role !== "owner" || !context.tenantId) return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });

  try {
    const { clientId, redirectUri, encryptionKey } = config();
    const pkce = createPlanfixPkcePair();
    const oauthState = createPlanfixOAuthState({ tenantId: context.tenantId, userId: context.user.id, verifier: pkce.verifier });
    const response = NextResponse.redirect(buildPlanfixAuthorizationUrl({ clientId, redirectUri, state: oauthState.state, challenge: pkce.challenge }));
    response.cookies.set(PLANFIX_OAUTH_COOKIE_NAME, sealPlanfixOAuthState(oauthState, encryptionKey), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/integrations/planfix",
      maxAge: PLANFIX_OAUTH_MAX_AGE_SECONDS,
      domain: planfixOAuthCookieDomain(redirectUri),
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Подключение Planfix пока не настроено." }, { status: 503 });
  }
}
