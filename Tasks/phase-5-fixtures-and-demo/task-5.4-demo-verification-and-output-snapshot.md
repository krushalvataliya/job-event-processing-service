# Task 5.4: Demo Verification and Output Snapshot

## Objective
Run and verify `scripts/demo.ts` in an end-to-end environment, ensure stability, and capture the execution output for inclusion in `DEMO.md`.

## Background & Requirements
- A reliable production service requires a predictable, reproducible demonstration walkthrough.
- Having a verified log of demo runs ensures operators and reviewers can validate system correctness step-by-step.
- Must document all steps, inputs, and outputs.

## Detailed Steps

1. **Execute Demo Script**:
   - Run `npm run setup` followed by `npm run demo`.
   - Ensure workers drain smoothly without unhandled exceptions or stalls.
   - Record exact terminal output.

2. **Verify Edge Case Outcomes**:
   - Confirm version monotonicity in final jobs table.
   - Confirm archive tombstone prevented stale reactivation.
   - Confirm retry attempt counts and permanent failure visibility in events table.

3. **Populate `DEMO.md`**:
   - Add exact command lines:
     ```bash
     # 1. Setup local environment & indexes
     npm run setup

     # 2. Run the automated 20-request scenario
     npm run demo
     ```
   - Embed captured console output and explain each phase's meaning.

## Verification Criteria
- [ ] `npm run demo` runs reliably on every execution without flaky timing failures.
- [ ] `DEMO.md` accurately reflects real execution logs and outcomes.
