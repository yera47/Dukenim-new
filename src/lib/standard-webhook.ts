import { createHmac, timingSafeEqual } from "node:crypto";

// Supabase Auth HTTP hooks use Standard Webhooks signatures over the raw body.
export function verifyStandardWebhook(headers: Headers, body: string, configuredSecret: string, now = Date.now()): boolean {
  const id = headers.get("webhook-id") ?? "";
  const timestamp = headers.get("webhook-timestamp") ?? "";
  const signatures = headers.get("webhook-signature") ?? "";
  if (!/^[\w-]{1,128}$/.test(id) || !/^\d{10}$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const secret = configuredSecret.replace(/^v1,/, "").replace(/^whsec_/, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(secret)) return false;
  const key = Buffer.from(secret, "base64");
  if (key.length < 24 || key.length > 64) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  for (const part of signatures.split(" ")) {
    if (!part.startsWith("v1,")) continue;
    const signature = part.slice(3);
    if (!/^[A-Za-z0-9+/]{43}=$/.test(signature)) continue;
    const actual = Buffer.from(signature, "base64");
    if (actual.length === expected.length && timingSafeEqual(actual, expected)) return true;
  }
  return false;
}
