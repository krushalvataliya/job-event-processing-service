# Task 4.3: GET /events/:eventId (Event Processing Status)

## Objective
Implement `GET /events/:eventId` allowing callers to inspect acceptance and processing state, attempt history, and failure reasons, strictly scoped by `tenantId` and `sourceId`.

## Background & Requirements
Per PRD §6.3 & IMPLEMENTATION_GUIDE.md §5:
- Query parameters required: `tenantId` (string, non-blank), `sourceId` (string, non-blank).
- Route parameter: `:eventId`.
- Response details:
  - Acceptance/processing status (`pending`, `claimed`, `completed`, `failed`).
  - Total attempts made.
  - Full attempt history (`attemptNumber`, `startedAt`, `outcome`, `httpStatus`, `error`, `nextRetryAt`).
  - `lastError` if failed.
  - Timestamp fields (`createdAt`, `completedAt`).
  - Must allow a client who received a `200` or `409` response on ingestion to look up the original event.
- If event does not exist for the specified `(tenantId, sourceId, eventId)`: return `404 Not Found`.

## Detailed Steps

1. **Add Route Handler in `src/api/routes/events.ts`**:
   - Validate query params with Zod schema (`tenantId`, `sourceId` required and non-blank).
   - Fetch event from `EventsRepository`.
   - Format response payload omitting internal implementation fields (like `payloadHash` or raw internal Mongo pointers) while exposing full operational visibility.

## Verification Criteria
- [ ] Returns `200 OK` with full attempt history for an existing event.
- [ ] Returns `404 Not Found` if event does not exist in the given tenant and source.
- [ ] Returns `400 Bad Request` if `tenantId` or `sourceId` query parameter is missing.
- [ ] Cross-tenant lookup returns `404 Not Found` (strict tenant isolation).
