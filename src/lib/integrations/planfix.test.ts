import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  PLANFIX_AUTHORIZATION_ENDPOINT,
  PLANFIX_PILOT_SCOPES,
  buildPlanfixAuthorizationUrl,
  buildPlanfixContactPayload,
  buildPlanfixTaskPayload,
  createPlanfixContact,
  createPlanfixPkcePair,
  createPlanfixTask,
  exchangePlanfixAuthorizationCode,
  PlanfixApiError,
  PlanfixOAuthError,
  planfixApiBaseUrl,
  type CanonicalIntegrationOrder,
} from "./planfix";

const order: CanonicalIntegrationOrder = {
  id: "11111111-1111-4111-8111-111111111111",
  version: "2026-09-09T18:00:00.000Z",
  orderNumber: 42,
  customerId: "22222222-2222-4222-8222-222222222222",
  customerName: "Алия",
  customerPhone: "+7 700 000 00 00",
  deliveryMethod: "courier",
  deliveryAddress: "Алматы, Абая 1",
  paymentMethod: "cash",
  paymentStatus: "pending",
  subtotal: 20_000,
  deliveryCost: 1_700,
  total: 21_700,
  currency: "KZT",
  items: [{ title: "Костюм", sku: "SKU-1", quantity: 2, unitPrice: 10_000 }],
};

describe("Planfix integration", () => {
  it("creates an S256 PKCE pair", () => {
    const verifier = "a".repeat(43);
    const pair = createPlanfixPkcePair(verifier);
    expect(pair.verifier).toBe(verifier);
    expect(pair.challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
  });

  it("builds the global authorization URL with least-privilege pilot scopes", () => {
    const url = new URL(buildPlanfixAuthorizationUrl({
      clientId: "dukenim-client",
      redirectUri: "https://dukenim.kz/api/integrations/planfix/callback",
      state: "s".repeat(32),
      challenge: "c".repeat(43),
    }));
    expect(url.origin + url.pathname).toBe(PLANFIX_AUTHORIZATION_ENDPOINT);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toBe(PLANFIX_PILOT_SCOPES.join(" "));
  });

  it("rejects unsafe redirect and account domains", () => {
    expect(() => buildPlanfixAuthorizationUrl({
      clientId: "x",
      redirectUri: "http://attacker.example/callback",
      state: "s".repeat(32),
      challenge: "c".repeat(43),
    })).toThrow("HTTPS");
    expect(() => planfixApiBaseUrl("planfix.com.attacker.example")).toThrow("Unexpected");
    expect(planfixApiBaseUrl("demo.planfix.com")).toBe("https://demo.planfix.com/rest");
  });

  it("maps a Dukenim buyer and order using stable external UUIDs", () => {
    expect(buildPlanfixContactPayload(order)).toMatchObject({
      sourceObjectId: order.customerId,
      name: "Алия",
      phones: [{ number: "+7 700 000 00 00" }],
    });
    expect(buildPlanfixTaskPayload(order, 7)).toMatchObject({
      sourceObjectId: order.id,
      sourceDataVersion: order.version,
      name: "Заказ №42 · 21 700 ₸",
      counterparty: { id: 7 },
    });
    expect(buildPlanfixTaskPayload(order).description).toContain("2 × 10 000 ₸");
  });

  it("exchanges a code without logging or exposing tokens", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 86_400,
      scope: PLANFIX_PILOT_SCOPES.join(" "),
      account_name: "demo",
      account_domain: "demo.planfix.com",
      account_url: "https://demo.planfix.com",
    }), { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
    const tokens = await exchangePlanfixAuthorizationCode({
      clientId: "client",
      code: "code",
      redirectUri: "https://dukenim.kz/api/integrations/planfix/callback",
      verifier: "v".repeat(43),
      fetcher,
    });
    expect(tokens.accountDomain).toBe("demo.planfix.com");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("accepts the documented account URL when account_domain is omitted", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 86_400,
      scope: "openid email",
      account_name: "demo",
      account_url: "https://demo.planfix.com/",
    }), { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
    const tokens = await exchangePlanfixAuthorizationCode({
      clientId: "client",
      code: "code",
      redirectUri: "https://dukenim.kz/api/integrations/planfix/callback",
      verifier: "v".repeat(43),
      fetcher,
    });
    expect(tokens.accountDomain).toBe("demo.planfix.com");
    expect(tokens.accountUrl).toBe("https://demo.planfix.com");
  });

  it("surfaces only a reviewed OAuth error code and status", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      error: "invalid_client",
      error_description: "must not be exposed",
    }), { status: 401, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
    await expect(exchangePlanfixAuthorizationCode({
      clientId: "client",
      code: "code",
      redirectUri: "https://dukenim.kz/api/integrations/planfix/callback",
      verifier: "v".repeat(43),
      fetcher,
    })).rejects.toMatchObject({ status: 401, code: "invalid_client" } satisfies Partial<PlanfixOAuthError>);
  });

  it("classifies a non-JSON successful token response without exposing it", async () => {
    const fetcher = vi.fn(async () => new Response("unexpected provider page", { status: 200 })) as unknown as typeof fetch;
    await expect(exchangePlanfixAuthorizationCode({
      clientId: "client",
      code: "code",
      redirectUri: "https://dukenim.kz/api/integrations/planfix/callback",
      verifier: "v".repeat(43),
      fetcher,
    })).rejects.toMatchObject({ code: "invalid_json" } satisfies Partial<PlanfixOAuthError>);
  });

  it("posts a task only to an allowed Planfix account domain", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ result: "success", id: 42 }), {
      status: 201,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
    await createPlanfixTask({ accountDomain: "demo.planfix.com", accessToken: "secret", order, fetcher });
    expect(fetcher).toHaveBeenCalledWith("https://demo.planfix.com/rest/task/", expect.objectContaining({
      method: "POST",
      cache: "no-store",
    }));
  });

  it("creates a contact with the stable Dukenim customer id", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ result: "success", id: 17 }), {
      status: 201,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
    await expect(createPlanfixContact({ accountDomain: "demo.planfix.com", accessToken: "secret", order, fetcher }))
      .resolves.toEqual({ id: 17 });
    const body = JSON.parse(String(vi.mocked(fetcher).mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({ sourceObjectId: order.customerId, name: "Алия" });
  });

  it("marks a network interruption as an unknown provider outcome", async () => {
    const fetcher = vi.fn(async () => { throw new Error("timeout"); }) as unknown as typeof fetch;
    await expect(createPlanfixTask({ accountDomain: "demo.planfix.com", accessToken: "secret", order, fetcher }))
      .rejects.toMatchObject({ name: "PlanfixApiError", outcomeUncertain: true } satisfies Partial<PlanfixApiError>);
  });

  it("does not permit a blind retry after an unreadable successful response", async () => {
    const fetcher = vi.fn(async () => new Response("not-json", { status: 201 })) as unknown as typeof fetch;
    await expect(createPlanfixTask({ accountDomain: "demo.planfix.com", accessToken: "secret", order, fetcher }))
      .rejects.toMatchObject({ outcomeUncertain: true } satisfies Partial<PlanfixApiError>);
  });
});
