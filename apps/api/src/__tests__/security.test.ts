import { describe, expect, it } from "vitest";
import { apiKeyPrefix } from "@wcc/shared";
import { hashApiKey, issueApiKey } from "../lib/security.js";

describe("API key security", () => {
  it("issues live webhook keys with a display prefix", () => {
    const issued = issueApiKey();

    expect(issued.key).toMatch(/^whk_live_[0-9a-zA-Z]+$/);
    expect(issued.prefix).toBe(apiKeyPrefix(issued.key));
    expect(issued.hash).not.toContain(issued.key);
  });

  it("hashes API keys deterministically without storing the raw secret", () => {
    const key = "whk_live_testsecret";

    expect(hashApiKey(key)).toBe(hashApiKey(key));
    expect(hashApiKey(key)).not.toBe(key);
    expect(hashApiKey(`${key}_different`)).not.toBe(hashApiKey(key));
  });
});
