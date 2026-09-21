import { describe, expect, it } from "vitest";
import { formatWebhookSignature, signWebhookPayload, verifyWebhookSignature } from "../hmac.js";

describe("HMAC webhook signatures", () => {
  it("signs timestamp.payload and verifies a versioned header", () => {
    const signature = signWebhookPayload({
      secret: "super-secret",
      timestamp: 1_700_000_000,
      payload: "{\"ok\":true}"
    });

    expect(
      verifyWebhookSignature({
        secret: "super-secret",
        timestamp: 1_700_000_000,
        payload: "{\"ok\":true}",
        signatureHeader: formatWebhookSignature(signature),
        now: 1_700_000_120
      })
    ).toBe(true);
  });

  it("rejects stale timestamps", () => {
    const signature = signWebhookPayload({
      secret: "super-secret",
      timestamp: 1_700_000_000,
      payload: "{}"
    });

    expect(
      verifyWebhookSignature({
        secret: "super-secret",
        timestamp: 1_700_000_000,
        payload: "{}",
        signatureHeader: formatWebhookSignature(signature),
        now: 1_700_001_000
      })
    ).toBe(false);
  });
});
