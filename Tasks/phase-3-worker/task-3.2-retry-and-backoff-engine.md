# Task 3.2: Retry and Backoff Engine
Status: DONE

## Objective
Implement exponential backoff calculation and retry scheduling rules with configurable limits and injectable time providers for deterministic testing.

## Background & Requirements
Per PRD §6.2 & IMPLEMENTATION_GUIDE.md §3, §4:
- In the normal provider-failure path, an event may be attempted at most 3 times (`RETRY_MAX_ATTEMPTS = 3`, including the initial attempt).
- Backoff between attempts must follow an exponential progression:
  $$\text{delay} = \text{baseDelayMs} \times 2^{(\text{attempt} - 1)}$$
  - Example with `baseDelayMs = 500`:
    - After attempt 1 (failed with 503): delay = $500 \times 2^0 = 500\text{ms}$.
    - After attempt 2 (failed with 503): delay = $500 \times 2^1 = 1000\text{ms}$.
    - After attempt 3 (failed with 503): attempts reach 3 $\rightarrow$ no further retry; transition directly to terminal `failed` status.
- Testing support: System must support overriding `baseDelayMs` or injecting a mock clock so that integration tests and load tests don't have to sleep for long wall-clock durations.
- No busy-loop polling: A retryable event must have `nextAttemptAt` set into the future and be unclaimed so workers only query it when `nextAttemptAt <= now`.

## Detailed Steps

1. **Create `src/worker/backoff.ts`**:
   - Function `calculateBackoffMs(attempt: number, baseDelayMs: number, maxDelayMs = 30000): number`:
     ```ts
     export function calculateBackoffMs(
       attempt: number,
       baseDelayMs: number,
       maxDelayMs = 30000
     ): number {
       if (attempt <= 0) return 0;
       const delay = baseDelayMs * Math.pow(2, attempt - 1);
       return Math.min(delay, maxDelayMs);
     }

     export function computeNextAttemptDate(
       attempt: number,
       baseDelayMs: number,
       now: Date = new Date()
     ): Date {
       const delayMs = calculateBackoffMs(attempt, baseDelayMs);
       return new Date(now.getTime() + delayMs);
     }
     ```

2. **Define Clock Interface**:
   - Provide an injectable clock interface `Clock`:
     ```ts
     export interface Clock {
       now(): Date;
     }

     export const systemClock: Clock = {
       now: () => new Date()
     };
     ```

## Verification Criteria
- [ ] Attempt 1 backoff equals `baseDelayMs`.
- [ ] Attempt 2 backoff equals `2 * baseDelayMs`.
- [ ] Attempt 3 backoff equals `4 * baseDelayMs`.
- [ ] Jitter/capping functions as expected if configured.
- [ ] Clock injection allows simulating immediate future dates in test suites.
