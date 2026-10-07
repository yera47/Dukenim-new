import { beforeEach, describe, expect, it, vi } from "vitest";

const access = vi.hoisted(() => ({ premium: vi.fn(async () => true) }));
vi.mock("@/lib/auth", () => ({ requireRole: vi.fn(async () => ({ tenantId: "tenant-server", userId: "owner-a" })) }));
vi.mock("@/lib/plan-access", () => ({ tenantHasPlan: access.premium }));
import { GET, POST } from "./route";

function validBody() {
  const body = new FormData();
  body.set("source", new File(["image"], "source.jpg", { type: "image/jpeg" }));
  body.set("scenario", "product_photos");
  body.set("mode", "background_composite");
  body.set("outputCount", "5");
  body.set("instruction", "Светлый фон и мягкая тень");
  body.set("merchantFacts", "");
  body.set("idempotencyKey", "00000000-0000-4000-8000-000000000001");
  body.set("merchantApproved", "true");
  return body;
}

function post(body: FormData, headers?: HeadersInit) {
  return POST(new Request("http://local/api/ai-studio/product-photos", { method: "POST", body, headers }));
}

describe("product photo route release gate", () => {
  beforeEach(() => { vi.clearAllMocks(); access.premium.mockResolvedValue(true); });

  it("locks Base before parsing files or contacting a provider", async () => {
    access.premium.mockResolvedValue(false);
    expect((await GET()).status).toBe(403);
    expect((await post(validBody())).status).toBe(403);
  });

  it("reports an honest disabled capability", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ enabled: false, provider: null });
  });

  it("validates a tenant-bound request then refuses any live provider call", async () => {
    const response = await post(validBody());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ retryable: false });
  });

  it("requires real reference photos for creative angles", async () => {
    const body = validBody();
    body.set("mode", "creative_angles");
    const response = await post(body);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("реальных фото");
  });

  it("rejects tenant injection and unverified object references", async () => {
    for (const key of ["tenantId", "sourceObjectPath", "referenceIds"]) {
      const body = validBody();
      body.set(key, "tenant-other/value");
      expect((await post(body)).status).toBe(400);
    }
  });

  it("rejects invalid files, missing approval and missing idempotency", async () => {
    const wrongType = validBody();
    wrongType.set("source", new File(["text"], "source.txt", { type: "text/plain" }));
    expect((await post(wrongType)).status).toBe(400);
    const noApproval = validBody();
    noApproval.delete("merchantApproved");
    expect((await post(noApproval)).status).toBe(400);
    const noKey = validBody();
    noKey.delete("idempotencyKey");
    expect((await post(noKey)).status).toBe(400);
  });

  it("rejects oversized requests before multipart parsing", async () => {
    const response = await post(validBody(), { "content-length": "65000001" });
    expect(response.status).toBe(413);
  });
});
