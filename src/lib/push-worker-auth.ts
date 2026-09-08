import { createHmac, timingSafeEqual } from "node:crypto";

function equal(left: string, right: string) {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authorizePushWorker(headers: Headers, secret: string | undefined, now = Date.now()): boolean {
  if (!secret || secret.length < 32) return false;
  const bearer = headers.get("authorization");
  if (bearer && equal(bearer, `Bearer ${secret}`)) return true;
  const timestamp = headers.get("x-dukenim-time") ?? "";
  const signature = headers.get("x-dukenim-signature") ?? "";
  if (!/^\d{10}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 90) return false;
  const expected = createHmac("sha256", secret).update(`dukenim:mobile-push:${timestamp}`).digest("hex");
  return equal(signature, expected);
}
