import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { apiKeyPrefix, createApiKey } from "@wcc/shared";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export function issueApiKey(): { key: string; prefix: string; hash: string } {
  const key = createApiKey();
  return { key, prefix: apiKeyPrefix(key), hash: hashApiKey(key) };
}

export function issueEndpointSecret(): string {
  return `whsec_${randomBytes(32).toString("base64url")}`;
}
