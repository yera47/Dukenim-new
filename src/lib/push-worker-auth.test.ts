import { createHmac } from "node:crypto";
import { expect, it } from "vitest";
import { authorizePushWorker } from "./push-worker-auth";
const secret = "a".repeat(64), now = 1788905000000;
function signed(time = now, key = secret) {
  const stamp = String(Math.floor(time / 1000));
  return new Headers({ "x-dukenim-time": stamp, "x-dukenim-signature": createHmac("sha256", key).update(`dukenim:mobile-push:${stamp}`).digest("hex") });
}
it("accepts a fresh scoped signature without a secret in the request", () => expect(authorizePushWorker(signed(), secret, now)).toBe(true));
it("rejects expired and future signatures", () => {
  expect(authorizePushWorker(signed(now - 91000), secret, now)).toBe(false);
  expect(authorizePushWorker(signed(now + 91000), secret, now)).toBe(false);
});
it("rejects wrong key, malformed and missing server secret", () => {
  expect(authorizePushWorker(signed(now, "b".repeat(64)), secret, now)).toBe(false);
  expect(authorizePushWorker(new Headers({ "x-dukenim-time": "../root" }), secret, now)).toBe(false);
  expect(authorizePushWorker(signed(), undefined, now)).toBe(false);
});
it("retains authenticated direct cron while rejecting a guessed bearer", () => {
  expect(authorizePushWorker(new Headers({ authorization: `Bearer ${secret}` }), secret, now)).toBe(true);
  expect(authorizePushWorker(new Headers({ authorization: "Bearer admin" }), secret, now)).toBe(false);
});
