import { describe, expect, it } from "vitest";
import { isStaffPasswordAllowed, readStaffInvitationToken, staffInvitationPath } from "./staff-invitation";

const token = "a".repeat(64);

describe("staff invitation links", () => {
  it("keeps new secrets in the URL fragment", () => {
    expect(staffInvitationPath(token)).toBe(`/staff/join#token=${token}`);
  });

  it("accepts current fragment and legacy query links", () => {
    expect(readStaffInvitationToken("", `#token=${token}`)).toBe(token);
    expect(readStaffInvitationToken(`?token=${token}`, "")).toBe(token);
  });

  it("rejects incomplete and non-hex secrets", () => {
    expect(readStaffInvitationToken("?token=short", "")).toBe("");
    expect(readStaffInvitationToken("", `#token=${"z".repeat(64)}`)).toBe("");
    expect(staffInvitationPath("bad")).toBe("/staff/join");
  });

  it("rejects obvious and account-derived passwords without composition rules", () => {
    expect(isStaffPasswordAllowed("password-password", "worker@example.com")).toBe(false);
    expect(isStaffPasswordAllowed("worker-very-long-secret", "worker@example.com")).toBe(false);
    expect(isStaffPasswordAllowed("случайная длинная фраза 84!", "worker@example.com")).toBe(true);
  });
});
