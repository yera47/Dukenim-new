import { randomBytes } from "node:crypto";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "./secrets";

export const PLANFIX_OAUTH_COOKIE_NAME = "__Secure-dukenim-planfix-oauth";
export const PLANFIX_OAUTH_MAX_AGE_SECONDS = 10 * 60;

export type PlanfixOAuthState = {
  state: string;
  verifier: string;
  tenantId: string;
  userId: string;
  expiresAt: number;
};

export function createPlanfixOAuthState(input: { tenantId: string; userId: string; verifier: string; now?: number }): PlanfixOAuthState {
  return {
    state: randomBytes(32).toString("base64url"),
    verifier: input.verifier,
    tenantId: input.tenantId,
    userId: input.userId,
    expiresAt: (input.now ?? Date.now()) + PLANFIX_OAUTH_MAX_AGE_SECONDS * 1000,
  };
}

export function sealPlanfixOAuthState(value: PlanfixOAuthState, keyValue?: string): string {
  return encryptIntegrationSecret(value, keyValue);
}

export function openPlanfixOAuthState(value: string, input: { state: string; userId: string; now?: number }, keyValue?: string): PlanfixOAuthState {
  const decoded = decryptIntegrationSecret<PlanfixOAuthState>(value, keyValue);
  if (!decoded.state || decoded.state !== input.state || decoded.userId !== input.userId || decoded.expiresAt < (input.now ?? Date.now())) {
    throw new Error("Invalid or expired Planfix OAuth state");
  }
  if (!/^[0-9a-f-]{36}$/i.test(decoded.tenantId) || !/^[A-Za-z0-9._~-]{43,128}$/.test(decoded.verifier)) {
    throw new Error("Invalid Planfix OAuth state payload");
  }
  return decoded;
}
