# Task 4.4: GET /jobs (Cursor Pagination and Filtering)
Status: DONE

## Objective
Implement `GET /jobs` route providing deterministic cursor-based pagination and status filtering, strictly scoped to the requesting tenant.

## Background & Requirements
Per PRD §6.3 & IMPLEMENTATION_GUIDE.md §5:
- Query parameters:
  - `tenantId` (string, required): tenant scope.
  - `sourceId` (string, optional): source filter.
  - `status` (string, optional, enum `['active', 'archived', 'all']`): defaults to `'active'`.
  - `limit` (integer, optional, default 20, capped at 100).
  - `cursor` (string, optional, opaque token).
- Pagination Determinism:
  - Must not use offset pagination (`skip`), which degrades at scale and suffers from page drifting when underlying data is updated.
  - Must use cursor pagination based on immutable document `_id` (`{ _id: { $gt: cursorId } }`).
  - Document behavior when data changes between page reads: Items inserted before the cursor will not shift previously read items; items inserted after the cursor will appear in subsequent pages.
- Multi-tenant Isolation:
  - Must never return jobs belonging to another tenant.

## Detailed Steps

1. **Add Route Handler in `src/api/routes/jobs.ts`**:
   - Parse and validate query parameters with Zod schema.
   - Delegate query to `JobsRepository.listJobs(...)`.
   - Format response:
     ```json
     {
       "items": [
         {
           "tenantId": "tenant-a",
           "sourceId": "main",
           "externalJobId": "alpha",
           "currentVersion": 1,
           "status": "active",
           "payload": { ... },
           "updatedAt": "2026-09-27T10:00:00.000Z"
         }
       ],
       "pageInfo": {
         "limit": 20,
         "hasMore": true,
         "nextCursor": "NjZkOWM3..."
       }
     }
     ```

## Verification Criteria
- [ ] Missing `tenantId` yields `400 Bad Request`.
- [ ] Default query only returns active jobs.
- [ ] `status=archived` returns archived tombstones.
- [ ] `status=all` returns both active and archived jobs.
- [ ] Cursor pagination iterates through all records without duplicates or omissions.
- [ ] Requesting jobs for Tenant B does not return jobs belonging to Tenant A.
