import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  buildBusinessRuQuery,
  BusinessRuApiError,
  normalizeBusinessRuAccountDomain,
  probeBusinessRuConnection,
  repairBusinessRuToken,
  validateBusinessRuCredentials,
} from "./business-ru";

const appId = "123456";
const secret = "a".repeat(32);
const token = "b".repeat(32);

function signedBody(value: Record<string, unknown>, signingToken: string) {
  const unsigned = JSON.stringify(value);
  const signature = createHash("md5").update(`${signingToken}${secret}${unsigned}`).digest("hex");
  return `${unsigned.slice(0, -1)},"app_psw":"${signature}"}`;
}

describe("Business.Ru integration", () => {
  it("accepts only a single Business.Ru account host", () => {
    expect(normalizeBusinessRuAccountDomain("https://w833379.business.ru/anything")).toBe("w833379.business.ru");
    expect(() => normalizeBusinessRuAccountDomain("business.ru.attacker.example")).toThrow(BusinessRuApiError);
    expect(() => normalizeBusinessRuAccountDomain("https://nested.demo.business.ru")).toThrow(BusinessRuApiError);
  });

  it("validates the documented integration id and 32-character secret", () => {
    expect(validateBusinessRuCredentials(appId, secret)).toEqual({ appId, secret });
    expect(() => validateBusinessRuCredentials("not-a-number", secret)).toThrow(BusinessRuApiError);
    expect(() => validateBusinessRuCredentials(appId, "short")).toThrow(BusinessRuApiError);
  });

  it("encodes sorted nested parameters like PHP http_build_query", () => {
    expect(buildBusinessRuQuery({ z: "a b", app_id: 7, filter: { ids: [2, 4] }, empty: null }))
      .toBe("app_id=7&empty=&filter%5Bids%5D%5B0%5D=2&filter%5Bids%5D%5B1%5D=4&z=a+b");
  });

  it("repairs a token without sending the secret", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const requestUrl = new URL(String(url));
      expect(requestUrl.searchParams.get("app_id")).toBe(appId);
      expect(requestUrl.searchParams.get("app_psw")).toBe(createHash("md5").update(`${secret}app_id=${appId}`).digest("hex"));
      expect(String(url)).not.toContain(secret);
      return new Response(signedBody({ status: "success", token }, ""), { status: 200 });
    }) as unknown as typeof fetch;
    await expect(repairBusinessRuToken({ accountDomain: "w833379.business.ru", appId, secret, fetcher })).resolves.toBe(token);
  });

  it("performs a signed, read-only customer order schema probe", async () => {
    const nextToken = "c".repeat(32);
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const requestUrl = new URL(String(url));
      if (requestUrl.pathname.endsWith("/repair.json")) {
        return new Response(signedBody({ status: "success", token }, ""), { status: 200 });
      }
      expect(requestUrl.pathname).toBe("/api/rest/customerorders.json");
      expect(requestUrl.searchParams.get("help")).toBe("1");
      expect(requestUrl.searchParams.get("app_psw")).toBe(createHash("md5")
        .update(`${token}${secret}app_id=${appId}&help=1`).digest("hex"));
      return new Response(signedBody({ status: "success", result: { model: "customerorders" }, token: nextToken }, token), { status: 200 });
    }) as unknown as typeof fetch;
    await expect(probeBusinessRuConnection({ accountDomain: "w833379.business.ru", appId, secret, fetcher }))
      .resolves.toEqual({ token: nextToken, checkedModel: "customerorders" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects a forged provider response", async () => {
    const fetcher = vi.fn(async () => new Response(
      `{"status":"success","token":"${token}","app_psw":"${"0".repeat(32)}"}`,
      { status: 200 },
    )) as unknown as typeof fetch;
    await expect(repairBusinessRuToken({ accountDomain: "w833379.business.ru", appId, secret, fetcher }))
      .rejects.toMatchObject({ code: "invalid_response" });
  });
});
