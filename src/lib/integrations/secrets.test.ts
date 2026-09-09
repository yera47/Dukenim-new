import { describe, expect, it } from "vitest";
import { createPlanfixOAuthState, openPlanfixOAuthState, sealPlanfixOAuthState } from "./oauth-state";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "./secrets";

const key = Buffer.alloc(32, 7).toString("base64url");

describe("integration secret storage", () => {
  it("encrypts and authenticates token payloads", () => {
    const encrypted = encryptIntegrationSecret({ accessToken: "access", refreshToken: "refresh" }, key);
    expect(encrypted).not.toContain("access");
    expect(decryptIntegrationSecret(encrypted, key)).toEqual({ accessToken: "access", refreshToken: "refresh" });
    const parts = encrypted.split(".");
    parts[3] = `${parts[3].startsWith("A") ? "B" : "A"}${parts[3].slice(1)}`;
    expect(() => decryptIntegrationSecret(parts.join("."), key)).toThrow();
  });

  it("binds OAuth state to the signed-in user and expiry", () => {
    const state = createPlanfixOAuthState({
      tenantId: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      verifier: "v".repeat(43),
      now: 1_000,
    });
    const sealed = sealPlanfixOAuthState(state, key);
    expect(openPlanfixOAuthState(sealed, { state: state.state, userId: state.userId, now: 2_000 }, key)).toEqual(state);
    expect(() => openPlanfixOAuthState(sealed, { state: "wrong", userId: state.userId, now: 2_000 }, key)).toThrow();
    expect(() => openPlanfixOAuthState(sealed, { state: state.state, userId: state.userId, now: state.expiresAt + 1 }, key)).toThrow();
  });
});
