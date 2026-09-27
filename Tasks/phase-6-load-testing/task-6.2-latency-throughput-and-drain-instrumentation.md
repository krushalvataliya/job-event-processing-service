# Task 6.2: Latency, Throughput, and Drain Instrumentation
Status: TODO

## Objective
Implement precise latency, throughput, queue drain timing, and projection accuracy verification within `scripts/load-test.ts`.

## Background & Requirements
Per PRD §8 & IMPLEMENTATION_GUIDE.md §7:
- Measurements required:
  - Total requests submitted, accepted (`202`), replay (`200`), error (`400`/`409`/`500`).
  - HTTP submission latency percentiles: p50 and p95 latency in milliseconds.
  - Overall ingestion throughput (requests/sec).
  - Queue drain duration: Total time from completion of HTTP submissions until `countPendingOrClaimed()` reaches 0.
  - Drain throughput (events processed per second).
- Projection Accuracy Verification:
  - Spot-check or exhaustively check that every job projection in the `jobs` collection reflects the **highest valid submitted version** and matching payload.
  - Assert zero version regressions or tombstone violations.

## Detailed Steps

1. **Latency Instrumentation**:
   - Collect individual request durations using `performance.now()`.
   - Calculate p50 and p95 latency accurately.

2. **Drain Detection**:
   - Monitor MongoDB `events` collection until all accepted events reach status `completed` or `failed`.
   - Log progress at regular intervals (e.g. every 1 second).

3. **Final-State Consistency Validator**:
   - Query all generated jobs from `jobs` collection.
   - For each job, verify `currentVersion` matches the mathematical maximum version submitted for that `(tenantId, sourceId, externalJobId)`.
   - Report any discrepancies.

## Verification Criteria
- [ ] Calculations for p50 and p95 are mathematically correct.
- [ ] Accurate timer measures queue drain from end of submission to queue empty.
- [ ] 100% of final projections match expected max versions.
