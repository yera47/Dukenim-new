import { createHash, timingSafeEqual } from "node:crypto";

type FetchLike = typeof fetch;
type QueryValue = string | number | boolean | null | undefined | QueryValue[] | { [key: string]: QueryValue };

const MAX_RESPONSE_BYTES = 1_000_000;
const REQUEST_TIMEOUT_MS = 12_000;

export class BusinessRuApiError extends Error {
  readonly code: "invalid_config" | "unauthorized" | "rate_limited" | "provider_error" | "invalid_response";

  constructor(code: BusinessRuApiError["code"]) {
    super(`Business.Ru API error (${code})`);
    this.name = "BusinessRuApiError";
    this.code = code;
  }
}

function md5(value: string) {
  return createHash("md5").update(value, "utf8").digest("hex");
}

function phpEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/[!'()*~]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+");
}

function scalarValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

function appendQuery(parts: string[], key: string, value: QueryValue) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendQuery(parts, `${key}[${index}]`, item));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) => appendQuery(parts, `${key}[${childKey}]`, childValue));
    return;
  }
  parts.push(`${phpEncode(key)}=${phpEncode(scalarValue(value))}`);
}

export function buildBusinessRuQuery(parameters: Record<string, QueryValue>) {
  const parts: string[] = [];
  Object.keys(parameters).sort().forEach((key) => appendQuery(parts, key, parameters[key]));
  return parts.join("&");
}

export function normalizeBusinessRuAccountDomain(accountDomainOrUrl: string) {
  const candidate = accountDomainOrUrl.trim();
  let hostname: string;
  try {
    hostname = /^https?:\/\//i.test(candidate)
      ? new URL(candidate).hostname.toLowerCase()
      : candidate.toLowerCase().replace(/\/$/, "");
  } catch {
    throw new BusinessRuApiError("invalid_config");
  }
  if (!/^[a-z0-9][a-z0-9_-]{0,62}\.business\.ru$/.test(hostname)) {
    throw new BusinessRuApiError("invalid_config");
  }
  return hostname;
}

export function validateBusinessRuCredentials(appId: string, secret: string) {
  const normalizedAppId = appId.trim();
  const normalizedSecret = secret.trim();
  if (!/^\d{1,20}$/.test(normalizedAppId) || !/^[\x21-\x7E]{32}$/.test(normalizedSecret)) {
    throw new BusinessRuApiError("invalid_config");
  }
  return { appId: normalizedAppId, secret: normalizedSecret };
}

function safeEqualHex(left: string, right: string) {
  if (!/^[a-f0-9]{32}$/i.test(left) || !/^[a-f0-9]{32}$/i.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function parseSignedResponse(raw: string, token: string, secret: string) {
  const signatureMatch = raw.match(/,\s*"app_psw"\s*:\s*"([a-f0-9]{32})"\s*}\s*$/i);
  if (!signatureMatch || signatureMatch.index === undefined) throw new BusinessRuApiError("invalid_response");
  const unsignedJson = `${raw.slice(0, signatureMatch.index)}}`;
  if (!safeEqualHex(md5(`${token}${secret}${unsignedJson}`), signatureMatch[1])) {
    throw new BusinessRuApiError("invalid_response");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(unsignedJson);
  } catch {
    throw new BusinessRuApiError("invalid_response");
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new BusinessRuApiError("invalid_response");
  const data = parsed as Record<string, unknown>;
  const nextToken = typeof data.token === "string" && /^[\x21-\x7E]{32}$/.test(data.token) ? data.token : token;
  return { data, token: nextToken };
}

async function signedRequest(input: {
  accountDomain: string;
  appId: string;
  secret: string;
  token: string;
  model: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  parameters?: Record<string, QueryValue>;
  fetcher?: FetchLike;
}) {
  const accountDomain = normalizeBusinessRuAccountDomain(input.accountDomain);
  const credentials = validateBusinessRuCredentials(input.appId, input.secret);
  if (!/^[a-z][a-z0-9_]{0,40}$/.test(input.model)) throw new BusinessRuApiError("invalid_config");
  const method = input.method ?? "GET";
  const parameters = { ...(input.parameters ?? {}), app_id: credentials.appId };
  const unsignedQuery = buildBusinessRuQuery(parameters);
  const body = `${unsignedQuery}&app_psw=${md5(`${input.token}${credentials.secret}${unsignedQuery}`)}`;
  const endpoint = new URL(`https://${accountDomain}/api/rest/${input.model}.json`);
  if (method === "GET") endpoint.search = body;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(endpoint.toString(), {
      method,
      headers: {
        accept: "application/json",
        ...(method === "GET" ? {} : { "content-type": "application/x-www-form-urlencoded" }),
      },
      body: method === "GET" ? undefined : body,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
  } catch {
    throw new BusinessRuApiError("provider_error");
  } finally {
    clearTimeout(timeout);
  }
  if (response.status === 401) throw new BusinessRuApiError("unauthorized");
  if (response.status === 503) throw new BusinessRuApiError("rate_limited");
  if (!response.ok) throw new BusinessRuApiError("provider_error");
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_RESPONSE_BYTES) throw new BusinessRuApiError("invalid_response");
  const raw = await response.text();
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_RESPONSE_BYTES) throw new BusinessRuApiError("invalid_response");
  return parseSignedResponse(raw, input.token, credentials.secret);
}

export async function repairBusinessRuToken(input: {
  accountDomain: string;
  appId: string;
  secret: string;
  fetcher?: FetchLike;
}) {
  const response = await signedRequest({ ...input, token: "", model: "repair", method: "GET" });
  if (!/^[\x21-\x7E]{32}$/.test(response.token)) throw new BusinessRuApiError("invalid_response");
  return response.token;
}

export async function probeBusinessRuConnection(input: {
  accountDomain: string;
  appId: string;
  secret: string;
  fetcher?: FetchLike;
}) {
  const token = await repairBusinessRuToken(input);
  const response = await signedRequest({
    ...input,
    token,
    model: "customerorders",
    method: "GET",
    parameters: { help: 1 },
  });
  if (response.data.status !== "success" || !("result" in response.data)) {
    throw new BusinessRuApiError("provider_error");
  }
  return { token: response.token, checkedModel: "customerorders" as const };
}
