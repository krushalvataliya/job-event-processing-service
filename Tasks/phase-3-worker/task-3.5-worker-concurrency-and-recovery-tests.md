# Task 3.5: Worker Concurrency and Recovery Tests

## Objective
Author integration tests in `test/integration/worker.test.ts` testing multiple competing worker loops, retry progression, permanent failures, and crash recovery with real MongoDB.

## Background & Requirements
Per PRD §8 & IMPLEMENTATION_GUIDE.md §8:
- Must validate:
  1. **Multiple Competing Workers**: Spin up 2 or 3 worker loops concurrently processing a batch of 20 events. Assert no event is processed more than once to completion.
  2. **Transient Retry Progression**: Event configured in provider plan with `["503", "503", "success"]`. Assert attempts increment, backoff is set, and it eventually finishes as `completed` with 3 attempts in history.
  3. **Permanent Failure (422)**: Event planned with `["422"]`. Assert it immediately transitions to `failed` after attempt 1, and no projection update occurs.
  4. **Retry Exhaustion (3x 429)**: Event planned with `["429", "429", "429"]`. Assert it retries twice, fails on the 3rd attempt, transitions to `failed`, and records all 3 attempts.
  5. **Crash-Before-Ack Recovery**: Worker 1 processes event up to projection write, then crashes. Worker 2 claims the expired lease and completes the event cleanly.

## Detailed Steps

1. **Create `test/integration/worker.test.ts`**:
   - Test case: Competing workers with 30 diverse events.
   - Test case: Retry progression (`503` $\rightarrow$ `503` $\rightarrow$ `success`).
   - Test case: Immediate permanent failure (`422`).
   - Test case: Retry exhaustion (`429` $\times$ 3).
   - Test case: Stale event skips provider verification and completes as no-op.
   - Test case: Higher version verification failure preserves lower version's projection.
   - Test case: Crash-before-ack simulated recovery test.

2. **Assertions & Checks**:
   - Assert `attemptHistory` contains correct timestamps, status codes, and error strings.
   - Assert MongoDB document states.

## Verification Criteria
- [ ] All worker integration tests pass against real MongoDB.
- [ ] Zero race conditions or double-processing during concurrent execution.
- [ ] Attempt history accurately tracks all simulated provider interactions.
