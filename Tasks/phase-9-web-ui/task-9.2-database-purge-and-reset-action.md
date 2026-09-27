# Task 9.2: Database Purge & Reset Action (Clear DB)
Status: DONE

## Objective
Implement a secure, interactive "Clear DB" capability both via an API route (`POST /admin/clear-db`) and an interactive UI button in the Developer Portal at `http://localhost:3000/`.

## Requirements & Design
1. **API Endpoint (`POST /admin/clear-db`)**:
   - Deletes records from both `events` and `jobs` collections.
   - Optional `tenantId` query param:
     - If provided, selectively deletes records for that tenant only (`{ tenantId }`).
     - If omitted, purges all records from both collections.
   - Returns JSON:
     ```json
     {
       "success": true,
       "message": "All events and job projections cleared from database",
       "deletedEvents": 14,
       "deletedJobs": 6,
       "tenantId": "all",
       "timestamp": "2026-09-27T..."
     }
     ```
2. **Interactive UI in Developer Portal (`src/api/ui.ts`)**:
   - Add a sleek "🗑️ Clear DB" button in the top navigation bar.
   - Clicking prompts a confirmation dialog to prevent accidental deletions.
   - On confirmation, executes `POST /admin/clear-db`.
   - Shows feedback toast with the count of deleted events and jobs.
   - Automatically refreshes the Job Projections list and resets audit outputs.
3. **Integration Tests**:
   - Add tests in `test/integration/api.test.ts` verifying:
     - `POST /admin/clear-db` deletes all records when called without parameters.
     - `POST /admin/clear-db?tenantId=...` scopes deletion to the specified tenant only.

## Verification Criteria
- [x] `POST /admin/clear-db` verified via integration tests.
- [x] UI button verified in browser subagent.
- [x] Task marked as `Status: DONE` and committed.
