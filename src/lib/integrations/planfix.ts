import { createHash, randomBytes } from "node:crypto";

export const PLANFIX_AUTHORIZATION_ENDPOINT = "https://auth.planfix.com/oauth/authorize";
export const PLANFIX_TOKEN_ENDPOINT = "https://auth.planfix.com/oauth/token";
export const PLANFIX_REVOCATION_ENDPOINT = "https://auth.planfix.com/oauth/revoke";

export const PLANFIX_PILOT_SCOPES = [
  "openid",
  "email",
  "contact_readonly",
  "contact_add",
  "task_readonly",
  "task_add",
  "task_update",
] as const;

export type PlanfixPkcePair = {
  verifier: string;
  challenge: string;
};

export type PlanfixOAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  accountName: string;
  accountDomain: string;
  accountUrl: string;
};

export type CanonicalIntegrationOrder = {
  id: string;
  version: string;
  orderNumber: number | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  deliveryMethod: string | null;
  deliveryAddress: string | null;
  paymentMethod: string | null;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  subtotal: number;
  deliveryCost: number;
  total: number;
  currency: "KZT";
  items: Array<{
    title: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
  }>;
};

type FetchLike = typeof fetch;

export class PlanfixApiError extends Error {
  readonly outcomeUncertain: boolean;

  constructor(message: string, outcomeUncertain: boolean) {
    super(message);
    this.name = "PlanfixApiError";
    this.outcomeUncertain = outcomeUncertain;
  }
}

const PLANFIX_OAUTH_ERROR_CODES = new Set([
  "invalid_client",
  "invalid_grant",
  "invalid_request",
  "invalid_scope",
  "unauthorized_client",
]);

export class PlanfixOAuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(`Planfix OAuth request failed (${status}:${code})`);
    this.name = "PlanfixOAuthError";
    this.status = status;
    this.code = code;
  }
}

export class PlanfixTokenResponseError extends Error {
  readonly code: "invalid_json" | "missing_tokens" | "missing_account" | "unexpected_account";

  constructor(code: PlanfixTokenResponseError["code"]) {
    super(`Invalid Planfix token response (${code})`);
    this.name = "PlanfixTokenResponseError";
    this.code = code;
  }
}

async function planfixOAuthFailure(response: Response): Promise<PlanfixOAuthError> {
  let code = "provider_error";
  try {
    const body = await response.json() as { error?: unknown };
    const candidate = String(body.error ?? "");
    if (PLANFIX_OAUTH_ERROR_CODES.has(candidate)) code = candidate;
  } catch {
    // OAuth error bodies are optional; never surface an unreviewed provider response.
  }
  return new PlanfixOAuthError(response.status, code);
}

export function createPlanfixPkcePair(verifier = randomBytes(32).toString("base64url")): PlanfixPkcePair {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw new Error("Invalid PKCE verifier");
  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}

export function buildPlanfixAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
  scopes?: readonly string[];
}): string {
  const redirect = new URL(input.redirectUri);
  if (redirect.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(redirect.hostname)) {
    throw new Error("Planfix redirect URI must use HTTPS");
  }
  if (!input.clientId.trim() || input.state.length < 32) throw new Error("Incomplete Planfix OAuth request");
  const url = new URL(PLANFIX_AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: redirect.toString(),
    response_type: "code",
    scope: (input.scopes ?? PLANFIX_PILOT_SCOPES).join(" "),
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

export async function exchangePlanfixAuthorizationCode(input: {
  clientId: string;
  clientSecret?: string;
  code: string;
  redirectUri: string;
  verifier: string;
  fetcher?: FetchLike;
}): Promise<PlanfixOAuthTokens> {
  const response = await (input.fetcher ?? fetch)(PLANFIX_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: input.clientId,
      ...(input.clientSecret ? { client_secret: input.clientSecret } : {}),
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.verifier,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw await planfixOAuthFailure(response);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new PlanfixTokenResponseError("invalid_json");
  }
  return parsePlanfixTokenResponse(body);
}

export async function refreshPlanfixAccessToken(input: {
  clientId: string;
  clientSecret?: string;
  refreshToken: string;
  fetcher?: FetchLike;
}): Promise<PlanfixOAuthTokens> {
  const response = await (input.fetcher ?? fetch)(PLANFIX_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: input.clientId,
      ...(input.clientSecret ? { client_secret: input.clientSecret } : {}),
      refresh_token: input.refreshToken,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw await planfixOAuthFailure(response);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new PlanfixTokenResponseError("invalid_json");
  }
  return parsePlanfixTokenResponse(body);
}

function parsePlanfixTokenResponse(value: unknown): PlanfixOAuthTokens {
  if (!value || typeof value !== "object") throw new PlanfixTokenResponseError("invalid_json");
  const data = value as Record<string, unknown>;
  const accountName = String(data.account_name ?? "");
  const accountValue = String(data.account_domain ?? data.account_url ?? "");
  if (!accountValue) throw new PlanfixTokenResponseError("missing_account");
  let accountDomain: string;
  try {
    accountDomain = normalizePlanfixAccountDomain(accountValue);
  } catch {
    throw new PlanfixTokenResponseError("unexpected_account");
  }
  const result = {
    accessToken: String(data.access_token ?? ""),
    refreshToken: String(data.refresh_token ?? ""),
    expiresIn: Number(data.expires_in),
    scope: String(data.scope ?? ""),
    accountName,
    accountDomain,
    accountUrl: `https://${accountDomain}`,
  };
  if (!result.accessToken || !result.refreshToken || !Number.isFinite(result.expiresIn) || result.expiresIn < 1) {
    throw new PlanfixTokenResponseError("missing_tokens");
  }
  return result;
}

function normalizePlanfixAccountDomain(accountDomainOrUrl: string): string {
  const candidate = accountDomainOrUrl.trim();
  const normalized = /^https?:\/\//i.test(candidate)
    ? new URL(candidate).hostname.toLowerCase()
    : candidate.toLowerCase().replace(/\/$/, "");
  if (!/^[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.planfix\.(?:com|ru)$/.test(normalized)) {
    throw new Error("Unexpected Planfix account domain");
  }
  return normalized;
}

export function planfixApiBaseUrl(accountDomain: string): string {
  const normalized = normalizePlanfixAccountDomain(accountDomain);
  return `https://${normalized}/rest`;
}

export function buildPlanfixContactPayload(order: CanonicalIntegrationOrder) {
  if (!order.customerId) return null;
  return {
    sourceObjectId: order.customerId,
    sourceDataVersion: order.version,
    name: order.customerName,
    phones: [{ number: order.customerPhone, type: 1 }],
    description: "Покупатель интернет-магазина Dukenim",
  };
}

export function buildPlanfixTaskPayload(order: CanonicalIntegrationOrder, counterpartyId?: number) {
  const lines = order.items.map((item) => {
    const sku = item.sku ? ` · SKU ${item.sku}` : "";
    return `• ${item.title}${sku} — ${item.quantity} × ${formatKzt(item.unitPrice)}`;
  });
  return {
    sourceObjectId: order.id,
    sourceDataVersion: order.version,
    name: `Заказ ${order.orderNumber ? `№${order.orderNumber}` : order.id.slice(0, 8)} · ${formatKzt(order.total)}`,
    description: [
      `Источник: Dukenim`,
      `Покупатель: ${order.customerName}`,
      `Телефон: ${order.customerPhone}`,
      `Получение: ${order.deliveryMethod ?? "не указано"}`,
      ...(order.deliveryAddress ? [`Адрес: ${order.deliveryAddress}`] : []),
      `Оплата: ${order.paymentMethod ?? "не указано"} (${order.paymentStatus})`,
      "",
      ...lines,
      "",
      `Товары: ${formatKzt(order.subtotal)}`,
      `Доставка: ${formatKzt(order.deliveryCost)}`,
      `Итого: ${formatKzt(order.total)}`,
    ].join("\n"),
    ...(counterpartyId ? { counterparty: { id: counterpartyId } } : {}),
  };
}

function parseCreatedObject(value: unknown): { id: number } {
  if (!value || typeof value !== "object") throw new PlanfixApiError("Invalid Planfix create response", true);
  const data = value as Record<string, unknown>;
  const id = Number(data.id);
  if (data.result !== "success" || !Number.isSafeInteger(id) || id < 1) {
    throw new PlanfixApiError("Planfix did not confirm object creation", true);
  }
  return { id };
}

async function postPlanfixObject(input: {
  accountDomain: string;
  accessToken: string;
  resource: "contact" | "task";
  payload: unknown;
  fetcher?: FetchLike;
}) {
  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(`${planfixApiBaseUrl(input.accountDomain)}/${input.resource}/`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(input.payload),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    // A timeout or network interruption can happen after Planfix accepted the
    // object. Callers must stop automatic retries and surface an uncertain state.
    throw new PlanfixApiError("Planfix delivery outcome is unknown", true);
  }
  if (!response.ok) throw new PlanfixApiError(`Planfix ${input.resource} creation failed (${response.status})`, false);
  try {
    return parseCreatedObject(await response.json());
  } catch (error) {
    if (error instanceof PlanfixApiError) throw error;
    throw new PlanfixApiError("Planfix returned an unreadable create response", true);
  }
}

export async function createPlanfixContact(input: {
  accountDomain: string;
  accessToken: string;
  order: CanonicalIntegrationOrder;
  fetcher?: FetchLike;
}) {
  const payload = buildPlanfixContactPayload(input.order);
  if (!payload) return null;
  return postPlanfixObject({
    accountDomain: input.accountDomain,
    accessToken: input.accessToken,
    resource: "contact",
    payload,
    fetcher: input.fetcher,
  });
}

export async function createPlanfixTask(input: {
  accountDomain: string;
  accessToken: string;
  order: CanonicalIntegrationOrder;
  counterpartyId?: number;
  fetcher?: FetchLike;
}) {
  return postPlanfixObject({
    accountDomain: input.accountDomain,
    accessToken: input.accessToken,
    resource: "task",
    payload: buildPlanfixTaskPayload(input.order, input.counterpartyId),
    fetcher: input.fetcher,
  });
}

function formatKzt(value: number): string {
  if (!Number.isInteger(value) || value < 0) throw new Error("Integration amounts must be non-negative integer KZT");
  return `${new Intl.NumberFormat("ru-KZ").format(value)} ₸`;
}
