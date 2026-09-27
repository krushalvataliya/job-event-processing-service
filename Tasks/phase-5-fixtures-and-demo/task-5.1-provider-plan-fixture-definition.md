# Task 5.1: Provider Plan Fixture Definition
Status: TODO

## Objective
Author the exact `fixtures/provider-plan.json` fixture file defining the simulated external verification behavior for all demo scenarios.

## Background & Requirements
Per PRD §6.2 & IMPLEMENTATION_GUIDE.md §4, §6:
- The fake provider reads this fixture to decide whether an event succeeds immediately or encounters 429, 503, or 422.
- The plan maps `eventId` to an array of outcomes representing sequential attempts.
- Scenarios required in the demo:
  1. Standard success (events omitted from the file default to immediate 200 success).
  2. Transient failure with recovery: 503 on attempt 1, 503 on attempt 2, success on attempt 3.
  3. Retry exhaustion: 429 on attempts 1, 2, and 3 $\rightarrow$ terminal failed.
  4. Permanent unprocessable failure: 422 on attempt 1 $\rightarrow$ immediate terminal failed.
  5. Transient 429 recovering on attempt 2.

## Detailed Steps

1. **Create `fixtures/provider-plan.json`**:
   - Structure:
     ```json
     {
       "demo-event-retry-recover": ["503", "503", "success"],
       "demo-event-rate-limit-recover": ["429", "success"],
       "demo-event-retry-exhaust": ["503", "503", "503"],
       "demo-event-permanent-fail": ["422"]
     }
     ```

2. **Validate Schema**:
   - Write a unit test ensuring all values are valid status strings (`"success"`, `"429"`, `"503"`, `"422"`).

## Verification Criteria
- [ ] File exists at `fixtures/provider-plan.json` and is valid JSON.
- [ ] Matches the event IDs utilized in the demo scenario fixture.
