import { createHmac } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { POST } from "./route";

const key = Buffer.alloc(32, 7);
const secret = `v1,whsec_${key.toString("base64")}`;
const event = { user: { phone: "+77070000000" }, sms: { otp: "123456" } };
function signedRequest(body = JSON.stringify(event), timestamp = Math.floor(Date.now() / 1000)) {
  const id = "msg_sms_test_1";
  const signature = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return new Request("https://www.dukenim.kz/api/auth/sms-hook", { method: "POST", body, headers: {
    "webhook-id": id, "webhook-timestamp": String(timestamp), "webhook-signature": `v1,${signature}`,
  } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function configure() {
  vi.stubEnv("SUPABASE_SMS_HOOK_SECRET", secret);
  vi.stubEnv("MOBIZON_API_KEY", "local-only-key");
  vi.stubEnv("MOBIZON_OTP_SENDER_ID", "DUKENIM");
}

it("fails closed without provider configuration", async () => {
  vi.stubEnv("MOBIZON_API_KEY", "");
  const send = vi.fn(); vi.stubGlobal("fetch", send);
  expect((await POST(signedRequest())).status).toBe(503);
  expect(send).not.toHaveBeenCalled();
});
it("rejects a forged or stale event before contacting the SMS provider", async () => {
  configure();
  const send = vi.fn(); vi.stubGlobal("fetch", send);
  const forged = signedRequest(JSON.stringify({ user: { phone: "+77071111111" }, sms: { otp: "999999" } }));
  forged.headers.set("webhook-signature", "v1," + Buffer.alloc(32).toString("base64"));
  expect((await POST(forged)).status).toBe(401);
  expect((await POST(signedRequest(undefined, Math.floor(Date.now() / 1000) - 301))).status).toBe(401);
  expect(send).not.toHaveBeenCalled();
});
it("sends a verified OTP through the shared platform account", async () => {
  configure();
  const send = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 0, data: { messageId: "message-1" } }), { status: 200 }));
  vi.stubGlobal("fetch", send);
  expect((await POST(signedRequest())).status).toBe(200);
  const [url, options] = send.mock.calls[0] as [string, RequestInit];
  expect(url).toContain("api.mobizon.kz/service/message/sendsmsmessage");
  const sent = new URLSearchParams(String(options.body));
  expect(sent.get("recipient")).toBe(event.user.phone);
  expect(sent.get("from")).toBe("DUKENIM");
  expect(sent.get("text")).toContain(event.sms.otp);
});
it("returns an error if the carrier rejects the SMS", async () => {
  configure();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 1 }), { status: 200 })));
  expect((await POST(signedRequest())).status).toBe(502);
});
it("rejects an invalid phone or code even with a valid signature", async () => {
  configure();
  const send = vi.fn(); vi.stubGlobal("fetch", send);
  expect((await POST(signedRequest(JSON.stringify({ user: { phone: "+15555555555" }, sms: { otp: "123456" } })))).status).toBe(400);
  expect(send).not.toHaveBeenCalled();
});
