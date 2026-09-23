export const STAFF_INVITATION_TOKEN = /^[a-f0-9]{64}$/;
export const STAFF_PASSWORD_MIN_LENGTH = 15;
const COMMON_PASSWORD_PARTS = ["password", "qwerty", "123456", "пароль", "dukenim"];

export function staffInvitationPath(token: string) {
  if (!STAFF_INVITATION_TOKEN.test(token)) return "/staff/join";
  return `/staff/join#token=${token}`;
}

export function readStaffInvitationToken(search: string, hash: string) {
  const queryToken = new URLSearchParams(search).get("token") ?? "";
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  const fragmentToken = fragment.startsWith("token=")
    ? new URLSearchParams(fragment).get("token") ?? ""
    : fragment;
  const token = fragmentToken || queryToken;
  return STAFF_INVITATION_TOKEN.test(token) ? token : "";
}

export function isStaffPasswordAllowed(password: string, email: string) {
  if (password.length < STAFF_PASSWORD_MIN_LENGTH || password.length > 128) return false;
  const normalized = password.toLocaleLowerCase("en-US");
  const emailName = email.split("@", 1)[0]?.toLocaleLowerCase("en-US") ?? "";
  if (COMMON_PASSWORD_PARTS.some(part => normalized.includes(part))) return false;
  if (emailName.length >= 4 && normalized.includes(emailName)) return false;
  return new Set(password).size >= 6;
}
