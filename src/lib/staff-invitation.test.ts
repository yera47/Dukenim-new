import { describe, expect, it } from "vitest";
import { isStaffPasswordAllowed, readStaffInvitationToken, staffInvitationPath, staffInvitationState } from "./staff-invitation";

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

  it("distinguishes pending, accepted, revoked and expired invitations",()=>{
    const base={accepted_at:null,revoked_at:null,expires_at:"2026-10-02T00:00:00Z"};
    expect(staffInvitationState(base,Date.parse("2026-10-01T00:00:00Z"))).toBe("pending");
    expect(staffInvitationState({...base,accepted_at:"2026-09-30T12:00:00Z"},Date.parse("2026-10-03T00:00:00Z"))).toBe("accepted");
    expect(staffInvitationState({...base,revoked_at:"2026-09-30T12:00:00Z"},Date.parse("2026-10-01T00:00:00Z"))).toBe("revoked");
    expect(staffInvitationState(base,Date.parse("2026-10-03T00:00:00Z"))).toBe("expired");
  });
});
