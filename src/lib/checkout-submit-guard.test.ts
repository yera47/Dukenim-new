import { describe, expect, it } from "vitest";
import { createCheckoutSubmissionGuard } from "./checkout-submit-guard";

describe("checkout submission guard", () => {
  it("blocks repeated submission until the current attempt finishes", () => {
    const guard = createCheckoutSubmissionGuard();
    expect(guard.acquire()).toBe(true);
    expect(guard.acquire()).toBe(false);
    guard.release();
    expect(guard.acquire()).toBe(true);
  });
});
