import { describe, expect, it, vi } from "vitest";
import { createVersionedPolarClient, POLAR_API_VERSION } from "./polar-http-client";

const uuid = "00000000-0000-4000-8000-000000000001";

describe("Polar API version pin", () => {
  it("adds the supported contract header to plan checkout, AI credits, and customer sessions", async () => {
    const requests: Request[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      return Response.json({ error: "local fixture" }, { status: 500 });
    });
    const polar = createVersionedPolarClient("test-token", "sandbox", fetcher);

    await polar.checkouts.create({
      products: [uuid], externalCustomerId: uuid, customerEmail: "owner@example.test",
      metadata: { tenantId: uuid, plan: "basic", billingPeriod: "monthly" },
      successUrl: "https://example.test/admin/plan?checkout=success",
    }).catch(() => undefined);
    await polar.checkouts.create({
      products: [uuid], externalCustomerId: uuid, customerEmail: "owner@example.test",
      metadata: { tenantId: uuid, purchaseType: "ai_credits", credits: "100" },
      successUrl: "https://example.test/admin/ai-studio?credits=success",
    }).catch(() => undefined);
    await polar.customerSessions.create({
      customerId: uuid,
      returnUrl: "https://example.test/admin/plan",
    }).catch(() => undefined);

    expect(requests).toHaveLength(3);
    expect(requests.map(request => request.headers.get("Polar-Version"))).toEqual([
      POLAR_API_VERSION,
      POLAR_API_VERSION,
      POLAR_API_VERSION,
    ]);
    expect(requests.map(request => new URL(request.url).pathname)).toEqual([
      "/v1/checkouts/",
      "/v1/checkouts/",
      "/v1/customer-sessions/",
    ]);
  });

  it("does not modify global fetch or webhook validation", async () => {
    const unversioned = new Request("https://example.test/webhook", { method: "POST" });
    expect(unversioned.headers.has("Polar-Version")).toBe(false);
  });
});
