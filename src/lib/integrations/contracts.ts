import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { integrationProviders, type IntegrationConnectionMode, type IntegrationProvider } from "./providers";

export type IntegrationCapability =
  | "catalog_read"
  | "catalog_write"
  | "stock_read"
  | "stock_write"
  | "orders_push"
  | "orders_pull"
  | "order_status_pull"
  | "customers_push"
  | "webhooks";

export type IntegrationReadiness = "request_only" | "preflight_only" | "local_pilot";
export type IntegrationWebhookProtocol = "timestamped_delivery_hmac_sha256_v1";

export type IntegrationProviderContract = {
  provider: IntegrationProvider;
  connection: IntegrationConnectionMode;
  readiness: IntegrationReadiness;
  capabilities: readonly IntegrationCapability[];
  payments: "separate";
  webhookProtocol: IntegrationWebhookProtocol | null;
  evidence: readonly string[];
  pilotConditions: readonly string[];
};

const requestOnlyContracts = Object.fromEntries(integrationProviders.map((provider) => [provider.key, {
  provider: provider.key,
  connection: provider.connection,
  readiness: "request_only",
  capabilities: [],
  payments: "separate",
  webhookProtocol: null,
  evidence: ["src/lib/integrations/providers.ts"],
  pilotConditions: ["Official sandbox, scopes, rate limits, and webhook guarantees are not yet verified."],
}])) as unknown as Record<IntegrationProvider, IntegrationProviderContract>;

export const integrationProviderContracts: Readonly<Record<IntegrationProvider, IntegrationProviderContract>> = {
  ...requestOnlyContracts,
  planfix: {
    ...requestOnlyContracts.planfix,
    readiness: "local_pilot",
    capabilities: ["orders_push", "customers_push"],
    evidence: [
      "src/lib/integrations/planfix.ts",
      "src/lib/integrations/planfix-sync.ts",
      "src/lib/integrations/planfix.test.ts",
    ],
    pilotConditions: [
      "Planfix API entitlement for the available trial account must be confirmed.",
      "A vendor-issued test account and least-privilege scopes are required before any provider call.",
    ],
  },
  biznes_ru: {
    ...requestOnlyContracts.biznes_ru,
    readiness: "preflight_only",
    capabilities: [],
    evidence: [
      "src/lib/integrations/business-ru.ts",
      "src/lib/integrations/business-ru.test.ts",
      "src/app/admin/integrations/business-ru-actions.test.ts",
    ],
    pilotConditions: ["Credential preflight is implemented; catalog, stock, order, customer, and webhook sync are not."],
  },
  keycrm: {
    ...requestOnlyContracts.keycrm,
    pilotConditions: [
      "Official limit is 20 requests per minute per API key.",
      "Order-status and payment events are separate; webhook delivery has three attempts.",
      "Signature semantics and source_uuid idempotency guarantees are unresolved and must not be assumed.",
    ],
  },
  megaplan: {
    ...requestOnlyContracts.megaplan,
    pilotConditions: ["Apps require an app-token; login/password application authorization is discontinued."],
  },
  kommo: {
    ...requestOnlyContracts.kommo,
    pilotConditions: ["A three-month technical account requires adding a technical user, which needs separate owner approval."],
  },
  rosta: {
    ...requestOnlyContracts.rosta,
    pilotConditions: [
      "The documented API is alpha.",
      "Creating an order requires shift_id; closing it requires cashbox_id and payments and must not be treated as cancellation.",
      "Warehouse items use POST /warehouses/{id}/items; a GET inventory contract must not be invented.",
      "No financial method may run until safe sandbox semantics are confirmed.",
    ],
  },
  insales: {
    ...requestOnlyContracts.insales,
    pilotConditions: [
      "Installation issues per-shop Basic Authorization credentials, not a generic OAuth connection.",
      "Respect API-Usage-Limit and 429 Retry-After; documented limit is 500 requests per app/shop per five minutes.",
    ],
  },
  poster: {
    ...requestOnlyContracts.poster,
    pilotConditions: [
      "A developer account/application is the test environment and each restaurant authorizes through OAuth.",
      "incomingOrders.createIncomingOrder is the documented order entry; after acceptance, changes/cancellation happen only at the register.",
    ],
  },
  moysklad: {
    ...requestOnlyContracts.moysklad,
    pilotConditions: [
      "The vendor draft is tested on a linked account and the solution subscription lasts 24 hours with daily renewal.",
      "The account's cost-free status is not confirmed.",
    ],
  },
  iiko: {
    ...requestOnlyContracts.iiko,
    pilotConditions: ["Only an automated request acknowledgement exists; no technical sandbox access has been issued."],
  },
  r_keeper: {
    ...requestOnlyContracts.r_keeper,
    pilotConditions: ["Only a dealer request acknowledgement exists; no technical sandbox access has been issued."],
  },
};

export function integrationProviderContract(provider: IntegrationProvider): IntegrationProviderContract {
  return integrationProviderContracts[provider];
}

export function hasIntegrationCapability(provider: IntegrationProvider, capability: IntegrationCapability): boolean {
  return integrationProviderContracts[provider].capabilities.includes(capability);
}

export type IntegrationOperation = {
  tenantId: string;
  provider: IntegrationProvider;
  capability: IntegrationCapability;
  entityType: "catalog" | "product" | "stock" | "order" | "customer";
  entityId: string;
  sourceVersion: string;
  idempotencyKey: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_VERSION = /^[A-Za-z0-9._:+-]{1,160}$/;

export function createIntegrationOperation(input: Omit<IntegrationOperation, "idempotencyKey">): IntegrationOperation {
  if (!UUID.test(input.tenantId) || !UUID.test(input.entityId)) throw new Error("Integration operation requires tenant-scoped UUIDs");
  if (!SAFE_VERSION.test(input.sourceVersion)) throw new Error("Integration operation source version is invalid");
  if (!hasIntegrationCapability(input.provider, input.capability)) {
    throw new Error(`Integration capability is not implemented for ${input.provider}`);
  }
  const idempotencyKey = createHash("sha256").update([
    "dukenim-integration-v1",
    input.tenantId,
    input.provider,
    input.capability,
    input.entityType,
    input.entityId,
    input.sourceVersion,
  ].join(":"), "utf8").digest("hex");
  return { ...input, idempotencyKey };
}

export type IntegrationFailureKind = "network" | "rate_limited" | "provider_5xx" | "unauthorized" | "invalid_request";

const RETRY_DELAYS_MS = [1_000, 4_000, 15_000] as const;

export function integrationRetryDecision(input: {
  attempt: number;
  kind: IntegrationFailureKind;
  idempotent: boolean;
  outcomeUncertain: boolean;
}): { retry: boolean; delayMs: number | null; reason: string } {
  if (!Number.isInteger(input.attempt) || input.attempt < 1) throw new Error("Integration attempt must be a positive integer");
  if (input.outcomeUncertain) return { retry: false, delayMs: null, reason: "manual_reconciliation_required" };
  if (!input.idempotent) return { retry: false, delayMs: null, reason: "operation_is_not_idempotent" };
  if (input.kind === "unauthorized" || input.kind === "invalid_request") {
    return { retry: false, delayMs: null, reason: "operator_action_required" };
  }
  const delayMs = RETRY_DELAYS_MS[input.attempt - 1];
  if (delayMs === undefined) return { retry: false, delayMs: null, reason: "retry_limit_reached" };
  return { retry: true, delayMs, reason: "transient_provider_failure" };
}

export function verifyIntegrationWebhookHmac(input: {
  rawBody: string;
  signature: string;
  timestamp: string;
  deliveryId: string;
  secret: string;
  now?: number;
  toleranceSeconds?: number;
}): { valid: boolean; deliveryKey: string | null } {
  const toleranceSeconds = input.toleranceSeconds ?? 300;
  if (!/^\d{10}$/.test(input.timestamp) || !/^[A-Za-z0-9._:-]{1,160}$/.test(input.deliveryId)) {
    return { valid: false, deliveryKey: null };
  }
  const ageSeconds = Math.abs((input.now ?? Date.now()) / 1000 - Number(input.timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > toleranceSeconds) return { valid: false, deliveryKey: null };
  const signature = input.signature.replace(/^sha256=/i, "");
  if (!/^[a-f0-9]{64}$/i.test(signature) || input.secret.length < 24) return { valid: false, deliveryKey: null };
  const expected = createHmac("sha256", input.secret)
    .update(`${input.timestamp}.${input.deliveryId}.${input.rawBody}`, "utf8")
    .digest();
  const actual = Buffer.from(signature, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return { valid: false, deliveryKey: null };
  return {
    valid: true,
    deliveryKey: createHash("sha256").update(`${input.deliveryId}:${signature}`, "utf8").digest("hex"),
  };
}

export type ProviderWebhookVerification =
  | { trusted: true; deliveryKey: string }
  | { trusted: false; deliveryKey: null; reason: "protocol_unverified" | "invalid_signature" };

/**
 * Provider-facing trust boundary. A mathematically valid generic HMAC is not
 * evidence that a vendor actually uses this envelope. Adapters must first
 * declare a protocol confirmed from that vendor's official contract.
 */
export function verifyProviderIntegrationWebhook(
  provider: IntegrationProvider,
  input: Parameters<typeof verifyIntegrationWebhookHmac>[0],
): ProviderWebhookVerification {
  const protocol = integrationProviderContracts[provider].webhookProtocol;
  if (protocol !== "timestamped_delivery_hmac_sha256_v1") {
    return { trusted: false, deliveryKey: null, reason: "protocol_unverified" };
  }
  const verified = verifyIntegrationWebhookHmac(input);
  return verified.valid && verified.deliveryKey
    ? { trusted: true, deliveryKey: verified.deliveryKey }
    : { trusted: false, deliveryKey: null, reason: "invalid_signature" };
}
