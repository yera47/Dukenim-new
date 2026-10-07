import { describe, expect, it } from "vitest";
import { ACTIVE_OWNER_STORE_COLUMNS, ARCHIVE_OWNER_STORE_COLUMNS } from "./store-archive-feature";

describe("mobile archive compatibility", () => {
  it("does not include draft columns in the production-compatible selector", () => {
    expect(ACTIVE_OWNER_STORE_COLUMNS).not.toContain("archived_");
    expect(ARCHIVE_OWNER_STORE_COLUMNS).toContain("archived_at");
    expect(ARCHIVE_OWNER_STORE_COLUMNS).toContain("archive_reason");
  });
});
