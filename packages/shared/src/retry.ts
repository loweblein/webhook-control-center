export const retryDelaysMs = [0, 10_000, 30_000, 120_000, 600_000] as const;

export const maxDeliveryAttempts = retryDelaysMs.length;

export function getRetryDelayMs(nextAttemptNumber: number): number | null {
  if (nextAttemptNumber < 1 || nextAttemptNumber > retryDelaysMs.length) {
    return null;
  }

  return retryDelaysMs[nextAttemptNumber - 1] ?? null;
}

export function hasAttemptsRemaining(attemptNumber: number): boolean {
  return attemptNumber < maxDeliveryAttempts;
}
