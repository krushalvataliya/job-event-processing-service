# Task 6.3: Load Execution and Results Capture
Status: DONE

## Objective
Execute the load test suite, verify system stability under heavy concurrent load, and record actual measured benchmark metrics for inclusion in `SCALE.md`.

## Background & Requirements
Per PRD §7 & §8:
- Run the full load test against local MongoDB and record actual machine configuration and observed numbers.
- PRD explicit requirement:
  "Report what you actually measured; the production numbers are a design discussion, not a required laptop benchmark. Do not extrapolate linearly without stating the assumptions."
- Outputs to record:
  - Machine specs (CPU cores, RAM, OS, Node version).
  - Ingestion concurrency level.
  - Number of workers running.
  - Accepted events count.
  - Replay events count (200 OK).
  - p50 submission latency (ms).
  - p95 submission latency (ms).
  - Drain time (seconds) and processing rate (events/sec).
  - Final consistency check result (100% match).

## Detailed Steps

1. **Run `npm run load-test`**:
   - Ensure clean database state for loadtest tenants.
   - Run the script and observe execution.
   - Capture console output.

2. **Format and Store Benchmark Results**:
   - Save benchmark report into a structured markdown snippet.
   - Transfer these real empirical measurements into the local benchmark section of `SCALE.md`.

## Verification Criteria
- [ ] Load test completes without crashes or unhandled promise rejections.
- [ ] Proves system handles concurrent submissions and worker claims reliably.
- [ ] Concrete numbers documented in `SCALE.md`.
