# Task 2.5: Database Integration Tests
Status: DONE

## Objective
Author rigorous integration tests running against a real MongoDB instance to validate unique indexes, concurrent insert races, lease claim concurrency, and conditional projection monotonicity.

## Background & Requirements
Per PRD §8 & IMPLEMENTATION_GUIDE.md §8:
- Mocks alone cannot validate database concurrency.
- Tests must execute against real MongoDB (using local `MONGO_URI` or test database).
- Required integration test coverage for database layer:
  1. Unique index enforcement on `events` `{ tenantId, sourceId, eventId }`.
  2. Concurrent duplicate inserts race condition: fire 10 simultaneous identical `insertEvent` calls, assert exactly 1 returns `'inserted'` and 9 return `'duplicate_replay'`.
  3. Unique index enforcement on `jobs` `{ tenantId, sourceId, externalJobId }`.
  4. Concurrent out-of-order version updates: fire v1, v2, v3, v4 concurrently across 10 iterations; assert final `currentVersion` is strictly `4` with v4 payload.
  5. Archive-before-upsert and delayed stale upsert behavior.
  6. Lease expiration recovery: document with `leaseExpiresAt` in the past is claimed by another worker.
  7. Cursor pagination boundary behavior with sequential inserts.

## Detailed Steps

1. **Setup Test Database Helper `test/integration/setup.ts`**:
   - Creates clean isolated test collections or isolated database per test suite.
   - Ensures indexes via `ensureIndexes(db)`.
   - Cleans collections between tests.

2. **Create `test/integration/events-repository.test.ts`**:
   - Test insert-first idempotency.
   - Test parallel identical inserts (`Promise.all` with 10 concurrent requests).
   - Test parallel claim attempts: two workers querying simultaneously claim separate documents without race.
   - Test claim query recovers abandoned lease (`leaseExpiresAt` in past).

3. **Create `test/integration/jobs-repository.test.ts`**:
   - Test atomic conditional upsert monotonicity.
   - Test out-of-order concurrent writes (v1, v2, v3, v5, v4).
   - Test archive-before-upsert.
   - Test reactivation: archive at v2, upsert at v1 (ignored), upsert at v3 (active).
   - Test cursor pagination: insert 50 jobs, paginate with `limit=10`, verify deterministic 5 pages covering all 50 items.

## Verification Criteria
- [ ] Running `npm run test:integration` passes all repository test suites against real MongoDB.
- [ ] No race conditions observed during 10+ concurrent parallel calls.
- [ ] Final projection version is always the highest submitted version.
- [ ] Test suite cleans up test databases/collections properly.
