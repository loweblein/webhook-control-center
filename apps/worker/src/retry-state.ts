import { getRetryDelayMs, hasAttemptsRemaining } from "@wcc/shared";

export function getFailureTransition(attemptNumber: number, now = new Date()) {
  const isDead = !hasAttemptsRemaining(attemptNumber);
  const delay = getRetryDelayMs(attemptNumber + 1);

  return {
    status: isDead ? "DEAD" : "FAILED",
    nextAttemptAt: !isDead && delay !== null ? new Date(now.getTime() + delay) : null
  } as const;
}
