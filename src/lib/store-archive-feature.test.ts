import { describe, expect, it } from "vitest";
import { ACTIVE_STORE_COLUMNS, ARCHIVE_STORE_COLUMNS, storeArchiveEnabled } from "./store-archive-feature";

describe("store archive feature gate", () => {
  it("is disabled unless explicitly enabled", () => {
    expect(storeArchiveEnabled(undefined)).toBe(false);
    expect(storeArchiveEnabled("")).toBe(false);
    expect(storeArchiveEnabled("false")).toBe(false);
    expect(storeArchiveEnabled("TRUE")).toBe(false);
    expect(storeArchiveEnabled("true")).toBe(true);
  });

  it("keeps archive columns out of the production-compatible selector", () => {
    expect(ACTIVE_STORE_COLUMNS).not.toContain("archived_");
    expect(ARCHIVE_STORE_COLUMNS).toContain("archived_at");
    expect(ARCHIVE_STORE_COLUMNS).toContain("archive_reason");
  });
});
