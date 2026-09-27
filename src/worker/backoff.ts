export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/**
 * Calculates exponential backoff delay in milliseconds:
 * delay = baseDelayMs * 2^(attempt - 1)
 *
 * Example with baseDelayMs = 500:
 * attempt 1: 500 * 2^0 = 500ms
 * attempt 2: 500 * 2^1 = 1000ms
 * attempt 3: 500 * 2^2 = 2000ms
 */
export function calculateBackoffMs(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs = 30000
): number {
  if (attempt <= 0) return 0;
  const exponent = Math.max(0, attempt - 1);
  const delay = baseDelayMs * Math.pow(2, exponent);
  return Math.min(delay, maxDelayMs);
}

/**
 * Computes the timestamp for the next retry attempt given current attempt count and base delay.
 */
export function computeNextAttemptDate(
  attempt: number,
  baseDelayMs: number,
  clock: Clock = systemClock
): Date {
  const delayMs = calculateBackoffMs(attempt, baseDelayMs);
  return new Date(clock.now().getTime() + delayMs);
}
