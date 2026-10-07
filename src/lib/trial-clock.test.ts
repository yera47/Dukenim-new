import { describe, expect, it } from "vitest";
import { trialClockDisplay } from "./trial-clock";

const NOW = Date.parse("2026-10-02T12:00:00.000Z");

describe("trialClockDisplay", () => {
  it("shows days and hours without timezone-dependent calendar math", () => {
    expect(trialClockDisplay({ status: "trial", endsAt: "2026-10-09T05:00:00+05:00", nowMs: NOW }).fullLabel).toBe("Осталось 6 дней 12 часов");
  });

  it("switches to hours and minutes during the last day", () => {
    expect(trialClockDisplay({ status: "trial", endsAt: new Date(NOW + 23 * 60 * 60_000 + 31 * 60_000).toISOString(), nowMs: NOW }).fullLabel).toBe("Осталось 23 часа 31 минута");
  });

  it.each([
    ["exact boundary", new Date(NOW).toISOString()],
    ["expired", new Date(NOW - 1).toISOString()],
    ["missing end", null],
    ["invalid end", "not-a-date"],
  ])("fails closed for %s", (_case, endsAt) => {
    expect(trialClockDisplay({ status: "trial", endsAt, nowMs: NOW }).state).toBe("expired");
  });

  it("does not present paid or paused tenants as trial users", () => {
    expect(trialClockDisplay({ status: "active", endsAt: new Date(NOW + 99_999_999).toISOString(), nowMs: NOW }).state).toBe("not_trial");
    expect(trialClockDisplay({ status: "paused", endsAt: new Date(NOW + 99_999_999).toISOString(), nowMs: NOW }).state).toBe("not_trial");
  });

  it("uses the supplied trusted clock, not the device clock", () => {
    const endsAt = new Date(NOW + 2 * 60 * 60_000).toISOString();
    expect(trialClockDisplay({ status: "trial", endsAt, nowMs: NOW }).compactLabel).toBe("2 ч 0 мин");
    expect(trialClockDisplay({ status: "trial", endsAt, nowMs: NOW + 3 * 60 * 60_000 }).state).toBe("expired");
  });
});
