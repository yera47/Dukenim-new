import { beforeEach, expect, it, vi } from "vitest";

const authorize = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));
vi.mock("@/lib/mobile-auth", () => ({ getMobileRoot: authorize }));
import { GET, POST } from "./route";

const getRequest = () => new Request("https://example.test/api/mobile/root/sales/trips");
const postRequest = (body: unknown) => new Request("https://example.test/api/mobile/root/sales/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => { authorize.mockReset(); authorize.mockResolvedValue(null); });

it("denies trip reads and mutations without a verified superadmin", async () => {
  expect((await GET(getRequest())).status).toBe(403);
  expect((await POST(postRequest({ action: "start" }))).status).toBe(403);
});

it("rejects an invalid route before touching trip storage", async () => {
  authorize.mockResolvedValue({ user: { id: "owner" } });
  const response = await POST(postRequest({ action: "start", zoneId: "Z01", leadIds: ["bad"] }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: expect.stringContaining("зону") });
});

it("rejects duplicate route stops before creating a trip", async () => {
  authorize.mockResolvedValue({ user: { id: "owner" } });
  const id = "44444444-4444-4444-8444-444444444444";
  expect((await POST(postRequest({ action: "start", zoneId: "Z001", leadIds: [id, id] }))).status).toBe(400);
});

it("requires a valid current-stop outcome and does not call storage", async () => {
  authorize.mockResolvedValue({ user: { id: "owner" } });
  const response = await POST(postRequest({ action: "complete_stop", stopId: "44444444-4444-4444-8444-444444444444", outcome: "paid" }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: expect.stringContaining("итог") });
});

it("does not allow finishing a trip without its exact identifier", async () => {
  authorize.mockResolvedValue({ user: { id: "owner" } });
  expect((await POST(postRequest({ action: "finish", tripId: "" }))).status).toBe(400);
});

it("rejects unknown actions", async () => {
  authorize.mockResolvedValue({ user: { id: "owner" } });
  expect((await POST(postRequest({ action: "refund" }))).status).toBe(400);
});
