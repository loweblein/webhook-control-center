import { describe, expect, it } from "vitest";
import { getFailureTransition } from "../retry-state.js";

describe("worker retry state transitions", () => {
  it("marks a failed attempt retryable with the next scheduled time", () => {
    const now = new Date("2026-09-20T12:00:00.000Z");
    const transition = getFailureTransition(1, now);

    expect(transition.status).toBe("FAILED");
    expect(transition.nextAttemptAt?.toISOString()).toBe("2026-09-20T12:00:10.000Z");
  });

  it("marks the delivery dead after the retry budget is exhausted", () => {
    const transition = getFailureTransition(5, new Date("2026-09-20T12:00:00.000Z"));

    expect(transition.status).toBe("DEAD");
    expect(transition.nextAttemptAt).toBeNull();
  });
});
