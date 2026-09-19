import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionContext: m.session }));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => ({ rpc: m.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
import { submitAiRequest } from "./request-action";
const generationId = "a52c0195-8411-46a4-8849-e3e388228c7a";
function form(kind = "payments", text = "Хочу подключить оплату картой") {
  const data = new FormData();
  data.set("generationId", generationId); data.set("kind", kind); data.set("text", text);
  data.set("tenantId", "forged-shop"); data.set("subject", "forged-subject");
  return data;
}
describe("AI support request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.session.mockResolvedValue({ user: { id: "owner" }, role: "owner", tenantId: "session-shop" });
    m.rpc.mockResolvedValue({ data: "saved-request", error: null });
  });
  it.each(["payments", "kaspi", "integrations", "support"])("submits %s with session tenant and saved-answer context", async kind => {
    expect(await submitAiRequest({}, form(kind))).toEqual({ requestId: "saved-request" });
    expect(m.rpc).toHaveBeenCalledWith("create_support_request", expect.objectContaining({
      p_tenant_id: "session-shop", p_source: "ai-studio",
      p_context: { page_path: "/admin/ai-studio", ai_intent: kind, ai_generation_id: generationId },
    }));
    expect(m.rpc.mock.calls[0][1].p_subject).not.toBe("forged-subject");
  });
  it.each([null, { user: { id: "staff" }, role: "customer", tenantId: "session-shop" }, { user: { id: "root" }, role: "superadmin", tenantId: null }])("rejects missing owner context", async session => {
    m.session.mockResolvedValue(session);
    expect(await submitAiRequest({}, form())).toHaveProperty("error");
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it.each([form("other"), form("support", "  "), form("support", "a".repeat(3001))])("rejects invalid input", async input => {
    expect(await submitAiRequest({}, input)).toHaveProperty("error");
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("preserves retry identity and only returns confirmed IDs", async () => {
    m.rpc.mockResolvedValueOnce({ data: null, error: { message: "private database details" } });
    const failed = await submitAiRequest({}, form());
    expect(failed.error).toBeTruthy(); expect(failed.requestId).toBeUndefined();
    expect(failed.error).not.toContain("private database details");
    expect(m.revalidate).not.toHaveBeenCalled();
    expect(await submitAiRequest(failed, form())).toEqual({ requestId: "saved-request" });
    expect(m.rpc.mock.calls[0]).toEqual(m.rpc.mock.calls[1]);
  });
  it("handles a lost response without claiming success", async () => {
    m.rpc.mockRejectedValue(new Error("network"));
    expect(await submitAiRequest({}, form())).toHaveProperty("error");
    expect(m.revalidate).not.toHaveBeenCalled();
  });
});
