# Task 5.3: Automated Demo Script (Phase 1 & Phase 2)
Status: TODO

## Objective
Implement `scripts/demo.ts` providing an automated, one-command executable demonstration of the end-to-end service running the 20-request fixture through Phase 1, queue draining, Phase 2, final queue draining, and state verification.

## Background & Requirements
Per PRD §8 & IMPLEMENTATION_GUIDE.md §6:
- **Executable via single command**: `npm run demo` (or `tsx scripts/demo.ts`).
- **Workflow**:
  1. Boot or connect to running API and background workers (support standalone execution where demo starts in-memory server & 2 workers if API isn't already running, or targets `http://localhost:3000`).
  2. Clean/reset demo tenant database state.
  3. Load `fixtures/demo-scenario.json`.
  4. Submit Phase 1 requests sequentially:
     - Assert that the HTTP status returned at submission time strictly matches `expectedHttpStatus`.
     - Log progress with clean formatted terminal output.
  5. Wait for Phase 1 to settle:
     - Poll until `pending` and `claimed` event count hits 0 (with a reasonable safety timeout of 15s).
  6. Submit Phase 2 requests (delayed out-of-order, stale, and reactivation events):
     - Assert HTTP status at submission time.
  7. Wait for Phase 2 to settle and fully drain.
  8. Assert final state:
     - Check event statuses (`completed`, `failed`) and attempt histories.
     - Check `jobs` collection projections (versions, status, payload).
     - Print clear PASS/FAIL summary table.
- **Rule**: Never hardcode fixture IDs into business logic. The demo script reads fixture IDs only from the fixture file.

## Detailed Steps

1. **Implement `scripts/demo.ts`**:
   - Add clean console formatting (colors, tables, spinner or progress indicators).
   - Implement drain helper polling `eventsRepository.countPendingOrClaimed()`.
   - Implement automated assertion checks comparing database state with `expectedFinalOutcome`.
   - Exit with code 0 on all tests passing, or code 1 with detailed failure diffs if any assertion fails.

## Verification Criteria
- [ ] Running `npm run demo` executes Phase 1 $\rightarrow$ Drain $\rightarrow$ Phase 2 $\rightarrow$ Drain $\rightarrow$ Verification.
- [ ] Submissions match expected HTTP statuses (202, 200, 409, 400).
- [ ] Final assertions pass 100% on projections, versions, and event audit trails.
- [ ] Produces clean, readable output suitable for engineering review and demonstration walkthrough.
