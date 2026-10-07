import { describe, expect, it, vi } from "vitest";
import { boundedRequest, RequestTimeoutError } from "./bounded-request";

describe("boundedRequest", () => {
  it("returns a completed request", async () => {
    await expect(boundedRequest(Promise.resolve("ok"), 50)).resolves.toBe("ok");
  });
  it("ends a stalled request", async () => {
    vi.useFakeTimers();
    const result = boundedRequest(new Promise<string>(() => undefined), 100);
    const assertion = expect(result).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    vi.useRealTimers();
  });
});
