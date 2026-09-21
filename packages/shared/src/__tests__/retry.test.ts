import { describe, expect, it } from "vitest";
import { getRetryDelayMs, hasAttemptsRemaining, maxDeliveryAttempts } from "../retry.js";

describe("retry schedule", () => {
  it("uses the product retry ladder", () => {
    expect([1, 2, 3, 4, 5].map(getRetryDelayMs)).toEqual([0, 10_000, 30_000, 120_000, 600_000]);
  });

  it("marks retries exhausted after the last attempt", () => {
    expect(hasAttemptsRemaining(maxDeliveryAttempts - 1)).toBe(true);
    expect(hasAttemptsRemaining(maxDeliveryAttempts)).toBe(false);
  });
});
