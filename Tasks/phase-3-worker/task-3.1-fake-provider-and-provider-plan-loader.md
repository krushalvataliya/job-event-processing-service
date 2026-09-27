# Task 3.1: Fake Provider and Provider Plan Loader
Status: DONE

## Objective
Implement the simulated external verification provider client that reads plan definitions from `fixtures/provider-plan.json` and returns deterministic simulation outcomes per event and attempt count.

## Background & Requirements
Per PRD §6.2 & IMPLEMENTATION_GUIDE.md §4:
- The external verification step simulates calling a third-party job verification API.
- Must read configuration from `fixtures/provider-plan.json`.
- Outcomes:
  - `success` (or `200`): verification passed.
  - `429` (Rate Limited): retryable failure.
  - `503` (Service Unavailable): retryable failure.
  - `422` (Unprocessable Entity): permanent failure.
- Default behavior: If an event is not listed in `fixtures/provider-plan.json`, or if all planned attempts are exhausted, the default outcome is immediate **success**.
- Deterministic behavior: The provider client must be a pure, deterministic function given `(eventId, attemptNumber)`.
- No fixture IDs may be hardcoded in `/src` code. All outcomes must be loaded dynamically from the plan file.

## Detailed Steps

1. **Define Schema for `fixtures/provider-plan.json`**:
   - Format: Map of `eventId` to an array of string outcomes:
     ```json
     {
       "event-retry-transient": ["503", "503", "success"],
       "event-retry-exhaust": ["429", "429", "429"],
       "event-perm-fail": ["422"]
     }
     ```

2. **Create `src/provider/verification-client.ts`**:
   - Interface:
     ```ts
     export type ProviderOutcomeType = 'success' | '429' | '503' | '422';

     export interface ProviderResult {
       outcome: 'success' | 'retryable_error' | 'permanent_error';
       httpStatus: number;
       errorMessage?: string;
     }

     export class VerificationClient {
       constructor(private planFilePath?: string) {}

       async verifyEvent(eventId: string, attemptNumber: number): Promise<ProviderResult> {
         // Load plan (cached or fresh in dev)
         const plan = this.getPlanForEvent(eventId);
         const plannedOutcome = plan?.[attemptNumber - 1] ?? 'success';

         if (plannedOutcome === '503') {
           return {
             outcome: 'retryable_error',
             httpStatus: 503,
             errorMessage: 'Simulated 503 Service Unavailable'
           };
         }
         if (plannedOutcome === '429') {
           return {
             outcome: 'retryable_error',
             httpStatus: 429,
             errorMessage: 'Simulated 429 Too Many Requests'
           };
         }
         if (plannedOutcome === '422') {
           return {
             outcome: 'permanent_error',
             httpStatus: 422,
             errorMessage: 'Simulated 422 Unprocessable Entity - Invalid job posting'
           };
         }

         return {
           outcome: 'success',
           httpStatus: 200
         };
       }
     }
     ```

## Verification Criteria
- [ ] For an unlisted event ID, `verifyEvent` returns `success` with status 200.
- [ ] For an event planned with `["503", "success"]`:
  - Attempt 1 returns `retryable_error` (503).
  - Attempt 2 returns `success` (200).
- [ ] For an event planned with `["422"]`:
  - Attempt 1 returns `permanent_error` (422).
- [ ] No hardcoded event IDs exist within `src/provider/`.
