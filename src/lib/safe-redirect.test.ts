import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./safe-redirect";

describe("safeInternalPath", () => {
  it("keeps valid internal paths with query and hash", () => {
    expect(safeInternalPath("/register?social=1#plan", "/login")).toBe(
      "/register?social=1#plan",
    );
  });

  it.each([
    "//evil.example/steal",
    "///evil.example/steal",
    "https://evil.example/steal",
    "/\\evil.example/steal",
    "\\evil.example/steal",
  ])("rejects an external or ambiguous redirect: %s", (value) => {
    expect(safeInternalPath(value, "/login")).toBe("/login");
  });

  it("uses the fallback for empty and invalid input", () => {
    expect(safeInternalPath(null, "/login")).toBe("/login");
    expect(safeInternalPath("%", "/login")).toBe("/login");
  });
});
