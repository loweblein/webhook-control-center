import { randomBytes } from "node:crypto";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function randomToken(size = 32): string {
  const bytes = randomBytes(size);
  let token = "";

  for (const byte of bytes) {
    token += alphabet[byte % alphabet.length];
  }

  return token;
}

export function prefixedId(prefix: "evt" | "dlv" | "atm" | "wsp" | "ep" | "key"): string {
  return `${prefix}_${randomToken(18)}`;
}

export function createApiKey(): string {
  return `whk_live_${randomToken(36)}`;
}

export function apiKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, 18);
}
