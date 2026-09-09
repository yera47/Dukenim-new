import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_BYTES = 32;
const IV_BYTES = 12;

function decodeKey(value = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY ?? ""): Buffer {
  const key = Buffer.from(value, "base64url");
  if (key.length !== KEY_BYTES) throw new Error("Integration encryption key is not configured");
  return key;
}

export function encryptIntegrationSecret(value: unknown, keyValue?: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", decodeKey(keyValue), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptIntegrationSecret<T>(value: string, keyValue?: string): T {
  const [version, ivValue, tagValue, encryptedValue, extra] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue || extra) throw new Error("Invalid encrypted integration secret");
  const decipher = createDecipheriv("aes-256-gcm", decodeKey(keyValue), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}
