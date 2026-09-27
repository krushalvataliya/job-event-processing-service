# Task 5.2: Demo Scenario 20-Requests Fixture
Status: DONE

## Objective
Author `fixtures/demo-scenario.json` containing the exact 20-request test scenario split into Phase 1 and Phase 2, covering every edge case specified in the PRD.

## Background & Requirements
Per PRD §8 & IMPLEMENTATION_GUIDE.md §6:
- Exactly 20 requests in total.
- Split into:
  - `phase1`: Requests submitted immediately in initial batch.
  - `phase2`: Delayed/out-of-order requests submitted only after Phase 1 has settled and drained.
- Edge cases that must be covered across the 20 requests:
  1. Standard valid upsert (`202 Accepted`).
  2. Exact duplicate replay with identical JSON (`200 OK`).
  3. Conflicting reuse of `eventId` with modified payload (`409 Conflict`).
  4. Invalid request with leading whitespace in identifier (`400 Bad Request`).
  5. Corrected resubmission reusing the rejected `eventId` (`202 Accepted`).
  6. Cross-tenant collision: identical `externalJobId` and `eventId` in another tenant (`202 Accepted`, independent job).
  7. Cross-source collision: identical `externalJobId` in same tenant but different `sourceId` (`202 Accepted`, independent job).
  8. Out-of-order version: Version 3 submitted before Version 2.
  9. Delayed stale version in Phase 2: Version 2 submitted after Version 3 settled (must be a no-op; Version 3 remains current).
  10. Archive-before-upsert: Archive at Version 2 submitted for a non-existent job.
  11. Stale upsert rejected by archive: Upsert at Version 1 submitted for the archived job (must not reactivate).
  12. Valid higher upsert reactivates: Upsert at Version 4 submitted for the archived job (reactivates job to active).
  13. Provider retry and recovery: Event planned with `["503", "503", "success"]`.
  14. Provider retry exhaustion: Event planned with `["503", "503", "503"]` $\rightarrow$ fails with attempt history.
  15. Provider permanent failure: Event planned with `["422"]` $\rightarrow$ fails immediately.
  16. Failed higher version does not overwrite lower version: Upsert v5 fails verification; previously applied v4 stays active.

## Detailed Steps

1. **Structure `fixtures/demo-scenario.json`**:
   - Provide clear metadata per request:
     - `step`: numeric identifier 1..20
     - `name`: descriptive name of the test case
     - `phase`: 1 or 2
     - `expectedHttpStatus`: 202, 200, 409, or 400
     - `body`: complete event JSON
     - `expectedFinalOutcome`: what the final event status and job projection should be after draining.

## Verification Criteria
- [ ] Contains exactly 20 request items.
- [ ] Validated against all required edge cases in PRD §8.
- [ ] File parses cleanly without JSON syntax errors.
