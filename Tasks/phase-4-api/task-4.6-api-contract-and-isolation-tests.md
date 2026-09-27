# Task 4.6: API Contract and Isolation Tests
Status: DONE

## Objective
Implement comprehensive HTTP integration tests in `test/integration/api.test.ts` testing the complete HTTP interface, all response codes, error scenarios, tenant isolation, and replay rules.

## Background & Requirements
Per PRD §8 & IMPLEMENTATION_GUIDE.md §8:
- Tests run against the Fastify app instance (using `app.inject()` for high speed and precision).
- Required test coverage:
  1. `POST /events`:
     - Returns `202` on initial valid submission.
     - Returns `200` on exact duplicate replay.
     - Returns `409` on conflicting reuse of same event identity.
     - Returns `400` on whitespace in `tenantId`, `sourceId`, `eventId`, `externalJobId`.
     - Returns `400` on invalid payload (e.g. `experienceMin > experienceMax`, non-https URL).
     - Allows reuse of `eventId` after a `400` rejection.
  2. `GET /events/:eventId`:
     - Returns `200` with status and attempts.
     - Returns `404` for non-existent event or mismatched tenant/source.
  3. `GET /jobs`:
     - Respects `tenantId` filter (Tenant B cannot see Tenant A's jobs).
     - Respects `status` filters (`active`, `archived`, `all`).
     - Cursor pagination works accurately across page boundaries.
  4. `GET /health`:
     - Returns `200` when DB is connected.

## Detailed Steps

1. **Create `test/integration/api.test.ts`**:
   - Instantiate Fastify app with test database.
   - Run tests covering all endpoints and edge cases.
   - Assert exact HTTP status codes, headers, and JSON structure.

## Verification Criteria
- [ ] 100% test pass rate across all API test suites.
- [ ] Explicit assertions on tenant isolation.
- [ ] All error response bodies follow consistent error structure.
