import { describe, it, expect } from 'vitest';
import { calculateBackoffMs, computeNextAttemptDate } from '../../src/worker/backoff.js';

describe('Task 3.2: Retry and Backoff Engine', () => {
  it('calculates exponential backoff progression accurately', () => {
    const base = 500;
    expect(calculateBackoffMs(1, base)).toBe(500); // 500 * 2^0
    expect(calculateBackoffMs(2, base)).toBe(1000); // 500 * 2^1
    expect(calculateBackoffMs(3, base)).toBe(2000); // 500 * 2^2
    expect(calculateBackoffMs(4, base)).toBe(4000); // 500 * 2^3
  });

  it('caps delay at maxDelayMs', () => {
    expect(calculateBackoffMs(10, 500, 5000)).toBe(5000);
  });

  it('computes future retry date using injected clock', () => {
    const fixedNow = new Date('2026-09-27T10:00:00.000Z');
    const mockClock = { now: () => fixedNow };

    const nextAttempt = computeNextAttemptDate(1, 500, mockClock);
    expect(nextAttempt.toISOString()).toBe('2026-09-27T10:00:00.500Z');

    const nextAttempt2 = computeNextAttemptDate(2, 500, mockClock);
    expect(nextAttempt2.toISOString()).toBe('2026-09-27T10:00:01.000Z');
  });
});
