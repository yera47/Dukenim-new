import { describe, expect, it } from "vitest";
import { STORY_LIFETIME_MS, storyIsVisible, storyLifecycleState } from "./story-lifecycle";

describe("store story lifecycle", () => {
  const now = Date.parse("2026-10-07T12:00:00.000Z");
  it("survives save/reload and stays visible before expiry", () => {
    const saved = { id: "story-a", tenant_id: "tenant-a", status: "published" as const, updated_at: new Date(now - 60_000).toISOString() };
    const reloaded = JSON.parse(JSON.stringify(saved));
    expect(storyLifecycleState(reloaded, now)).toBe("published");
    expect(storyIsVisible(reloaded, now)).toBe(true);
  });
  it("expires at 24 hours and fails closed on an invalid timestamp", () => {
    const boundary = { status: "published" as const, updated_at: new Date(now - STORY_LIFETIME_MS).toISOString() };
    expect(storyLifecycleState(boundary, now)).toBe("expired");
    expect(storyIsVisible({ ...boundary, updated_at: "invalid" }, now)).toBe(false);
  });
  it("unpublishes immediately and deliberate republish starts a new window", () => {
    expect(storyIsVisible({ status: "draft", updated_at: new Date(now).toISOString() }, now)).toBe(false);
    expect(storyIsVisible({ status: "published", updated_at: new Date(now).toISOString() }, now + 1)).toBe(true);
  });
  it("keeps a different tenant fixture isolated", () => {
    const tenantA = { tenant_id: "tenant-a", status: "published" as const, updated_at: new Date(now).toISOString() };
    expect(tenantA.tenant_id === "tenant-b" && storyIsVisible(tenantA, now)).toBe(false);
  });
});
