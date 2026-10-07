import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createIntegrationOperation,
  hasIntegrationCapability,
  integrationProviderContract,
  integrationProviderContracts,
  integrationRetryDecision,
  verifyProviderIntegrationWebhook,
  verifyIntegrationWebhookHmac,
} from "./contracts";
import { integrationProviders } from "./providers";

describe("integration provider contracts", () => {
  it("keeps every advertised provider explicit and payments separate", () => {
    expect(Object.keys(integrationProviderContracts).sort()).toEqual(integrationProviders.map(({ key }) => key).sort());
    expect(Object.values(integrationProviderContracts).every(({ payments }) => payments === "separate")).toBe(true);
    expect(Object.values(integrationProviderContracts).every(({ webhookProtocol }) => webhookProtocol === null)).toBe(true);
  });

  it("does not present request-only providers as connected implementations", () => {
    expect(integrationProviderContract("iiko")).toMatchObject({ readiness: "request_only", capabilities: [] });
    expect(integrationProviderContract("poster")).toMatchObject({ readiness: "request_only", capabilities: [] });
    expect(integrationProviderContract("biznes_ru")).toMatchObject({ readiness: "preflight_only", capabilities: [] });
    expect(integrationProviderContract("planfix").readiness).toBe("local_pilot");
    expect(hasIntegrationCapability("planfix", "orders_push")).toBe(true);
    expect(hasIntegrationCapability("planfix", "webhooks")).toBe(false);
    expect(integrationProviderContract("keycrm").pilotConditions.join(" ")).toContain("20 requests per minute");
    expect(integrationProviderContract("megaplan").pilotConditions.join(" ")).toContain("app-token");
    expect(integrationProviderContract("rosta").pilotConditions.join(" ")).toContain("must not be treated as cancellation");
    expect(integrationProviderContract("insales").pilotConditions.join(" ")).toContain("Retry-After");
    expect(integrationProviderContract("poster").pilotConditions.join(" ")).toContain("only at the register");
  });

  it("derives a stable tenant/provider/entity/version idempotency key", () => {
    const input = {
      tenantId: "11111111-1111-4111-8111-111111111111",
      provider: "planfix" as const,
      capability: "orders_push" as const,
      entityType: "order" as const,
      entityId: "22222222-2222-4222-8222-222222222222",
      sourceVersion: "2026-10-01T13:03:30.000Z",
    };
    expect(createIntegrationOperation(input).idempotencyKey).toBe(createIntegrationOperation(input).idempotencyKey);
    expect(createIntegrationOperation({ ...input, tenantId: "33333333-3333-4333-8333-333333333333" }).idempotencyKey)
      .not.toBe(createIntegrationOperation(input).idempotencyKey);
  });

  it("rejects cross-contract operations before any provider call", () => {
    expect(() => createIntegrationOperation({
      tenantId: "11111111-1111-4111-8111-111111111111",
      provider: "iiko",
      capability: "orders_push",
      entityType: "order",
      entityId: "22222222-2222-4222-8222-222222222222",
      sourceVersion: "v1",
    })).toThrow("not implemented");
  });
});

describe("integration delivery safety", () => {
  it("bounds retries for explicitly idempotent transient failures", () => {
    expect(integrationRetryDecision({ attempt: 1, kind: "network", idempotent: true, outcomeUncertain: false }))
      .toEqual({ retry: true, delayMs: 1_000, reason: "transient_provider_failure" });
    expect(integrationRetryDecision({ attempt: 4, kind: "provider_5xx", idempotent: true, outcomeUncertain: false }))
      .toEqual({ retry: false, delayMs: null, reason: "retry_limit_reached" });
  });

  it("never retries an uncertain, unauthorized, or non-idempotent write", () => {
    expect(integrationRetryDecision({ attempt: 1, kind: "network", idempotent: true, outcomeUncertain: true }).retry).toBe(false);
    expect(integrationRetryDecision({ attempt: 1, kind: "unauthorized", idempotent: true, outcomeUncertain: false }).retry).toBe(false);
    expect(integrationRetryDecision({ attempt: 1, kind: "rate_limited", idempotent: false, outcomeUncertain: false }).retry).toBe(false);
  });

  it("verifies timestamped raw-body HMAC and returns a replay-deduplication key", () => {
    const now = Date.UTC(2026, 9, 1, 13, 3, 30);
    const timestamp = String(now / 1_000);
    const deliveryId = "delivery-42";
    const rawBody = '{"order":"42"}';
    const secret = "test-webhook-secret-with-32-bytes";
    const signature = createHmac("sha256", secret).update(`${timestamp}.${deliveryId}.${rawBody}`).digest("hex");
    const verified = verifyIntegrationWebhookHmac({ rawBody, signature: `sha256=${signature}`, timestamp, deliveryId, secret, now });
    expect(verified.valid).toBe(true);
    expect(verified.deliveryKey).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyIntegrationWebhookHmac({ rawBody: `${rawBody} `, signature, timestamp, deliveryId, secret, now }).valid).toBe(false);
    expect(verifyIntegrationWebhookHmac({ rawBody, signature, timestamp, deliveryId, secret, now: now + 301_000 }).valid).toBe(false);
  });

  it("does not trust a generic HMAC for a provider with no confirmed signature protocol", () => {
    const now = Date.UTC(2026, 9, 1, 13, 3, 30);
    const timestamp = String(now / 1_000);
    const deliveryId = "delivery-42";
    const rawBody = '{"order":"42"}';
    const secret = "test-webhook-secret-with-32-bytes";
    const signature = createHmac("sha256", secret).update(`${timestamp}.${deliveryId}.${rawBody}`).digest("hex");

    expect(verifyProviderIntegrationWebhook("keycrm", {
      rawBody,
      signature,
      timestamp,
      deliveryId,
      secret,
      now,
    })).toEqual({ trusted: false, deliveryKey: null, reason: "protocol_unverified" });
  });
});
