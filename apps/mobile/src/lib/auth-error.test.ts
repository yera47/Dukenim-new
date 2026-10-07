import { describe, expect, it } from "vitest";
import { authErrorCopy } from "./auth-error";

describe("authErrorCopy", () => {
  it("distinguishes invalid credentials", () => {
    expect(authErrorCopy({ code: "invalid_credentials" }).message).toContain("Email или пароль");
  });
  it("distinguishes an unconfirmed email", () => {
    expect(authErrorCopy({ code: "email_not_confirmed" }).title).toBe("Подтвердите email");
  });
  it("does not expose an unknown provider error", () => {
    expect(authErrorCopy({ message: "private upstream detail" }).message).not.toContain("upstream");
  });
});
