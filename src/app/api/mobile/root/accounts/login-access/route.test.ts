import { beforeEach, expect, it, vi } from "vitest";

const authorize = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));
const audit = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ error: null })));
vi.mock("@/lib/mobile-auth", () => ({ getMobileRoot: authorize }));
vi.mock("@/lib/queries/root", () => ({ createPlatformAuditEvent: audit }));
import { GET, POST } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const actor = "22222222-2222-4222-8222-222222222222";
const body = { userId: id, email: "staff@example.test", expectedBlocked: false, block: true, reason: "Владелец запросил блокировку" };
const get = () => new Request(`https://example.test/api/mobile/root/accounts/login-access?id=${id}`);
const post = (value: unknown) => new Request("https://example.test/api/mobile/root/accounts/login-access", { method: "POST", body: JSON.stringify(value) });
const setup = (role = "buyer", banned_until: string | null = null) => {
  const updateUserById = vi.fn(async () => ({ error: null }));
  const getUserById = vi.fn(async () => ({ data: { user: { id, email: body.email, banned_until } }, error: null }));
  const from = vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { role }, error: null })) })) })) }));
  authorize.mockResolvedValue({ admin: { auth: { admin: { getUserById, updateUserById } }, from }, user: { id: actor } });
  return { updateUserById, getUserById };
};
beforeEach(() => { authorize.mockReset(); authorize.mockResolvedValue(null); audit.mockReset(); audit.mockResolvedValue({ error: null }); });

it("requires the current superadmin role", async () => {
  expect((await GET(get())).status).toBe(403);
  expect((await POST(post(body))).status).toBe(403);
});

it("does not allow self-block, malformed confirmation or superadmin target", async () => {
  const { updateUserById } = setup();
  expect((await POST(post({ ...body, userId: actor }))).status).toBe(400);
  expect((await POST(post({ ...body, reason: "x" }))).status).toBe(400);
  setup("superadmin");
  expect((await POST(post(body))).status).toBe(403);
  expect(updateUserById).not.toHaveBeenCalled();
});

it("rejects stale state before touching Auth", async () => {
  const { updateUserById } = setup("buyer", "2099-01-01T00:00:00Z");
  expect((await POST(post(body))).status).toBe(409);
  expect(updateUserById).not.toHaveBeenCalled();
});

it("fails closed if the audit request cannot be recorded", async () => {
  const { updateUserById } = setup(); audit.mockResolvedValue({ error: { message: "offline" } });
  expect((await POST(post(body))).status).toBe(503);
  expect(updateUserById).not.toHaveBeenCalled();
});

it("blocks only the exact account and records the outcome", async () => {
  const { updateUserById } = setup();
  const response = await POST(post(body));
  expect(response.status).toBe(200);
  expect(updateUserById).toHaveBeenCalledWith(id, { ban_duration: "876000h" });
  expect(audit).toHaveBeenCalledTimes(2);
});
