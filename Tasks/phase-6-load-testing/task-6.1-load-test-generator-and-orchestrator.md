# Task 6.1: Load Test Generator and Orchestrator

## Objective
Implement synthetic data generation and concurrent ingestion harness in `scripts/load-test.ts` satisfying all PRD load testing specifications.

## Background & Requirements
Per PRD §8 & IMPLEMENTATION_GUIDE.md §7:
- Dedicated tenant IDs: Use `loadtest-*` (e.g. `loadtest-tenant-1`, `loadtest-tenant-2`) to avoid polluting demo or development tenant data.
- Payload volume requirements:
  - $\ge 1,000$ distinct valid events.
  - $\ge 200$ exact replays of already-submitted events (asserting `200 OK`).
  - $\ge 50$ jobs where versions are intentionally submitted out of order (e.g. submit v3, then v1, then v4, then v2).
- Traffic execution:
  - Configurable concurrency (e.g. 20–50 parallel HTTP workers/connections).
  - Configurable worker engine pool draining the queue in parallel.
- No mocks: Executes against real MongoDB and running API.

## Detailed Steps

1. **Implement Synthetic Data Generator in `scripts/load-test.ts`**:
   - Generate:
     - 1,000 distinct valid events across multiple job IDs.
     - Select 200 of those events and schedule them as exact duplicate submissions.
     - Generate 50 jobs with 3–5 version changes each, shuffling the submission array so versions arrive completely out of order.
   - Total batch size: $\ge 1,250$ HTTP requests.

2. **Concurrency Runner**:
   - Use a promise pool / batch runner with concurrency limit $C$ (default 25 concurrent requests).
   - Track HTTP status codes returned (`202 Accepted`, `200 OK`, `400 Bad Request`, `409 Conflict`, `500 Error`).

## Verification Criteria
- [ ] Generates $\ge 1,000$ distinct events, 200 exact replays, $\ge 50$ out-of-order jobs.
- [ ] All load events use `loadtest-*` tenant IDs.
- [ ] Concurrency runner executes without socket exhaustion or connection drops.
