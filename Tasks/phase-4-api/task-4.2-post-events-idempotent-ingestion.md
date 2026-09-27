# Task 4.2: POST /events (Idempotent Ingestion Endpoint)
Status: TODO

## Objective
Implement `POST /events` route ensuring durable asynchronous event acceptance, strict validation, canonical hashing, insert-first idempotency, and correct HTTP status codes (`202`, `200`, `409`, `400`).

## Background & Requirements
Per PRD §6.1 & IMPLEMENTATION_GUIDE.md §2:
- **Request Flow**:
  1. Parse body and run strict Zod validation + whitespace check on `tenantId`, `sourceId`, `eventId`, `externalJobId`.
     - Invalid $\rightarrow$ return `400 Bad Request`. **Crucial**: Do NOT touch the database; the `eventId` is NOT reserved!
  2. Normalize payload if `operation === 'upsert'`.
  3. Compute canonical SHA-256 hash of the normalized request content.
  4. Perform atomic insert-first into `events` collection:
     - Document has `status: 'pending'`, `attempts: 0`, `nextAttemptAt: now`.
     - **Success**: Return `202 Accepted` with payload:
       ```json
       {
         "status": "accepted",
         "eventId": "event-101",
         "message": "Event durably queued for processing"
       }
       ```
     - **Duplicate Key Violation (E11000 on tenantId+sourceId+eventId)**:
       - Query existing event by `(tenantId, sourceId, eventId)`.
       - If `existing.payloadHash === incomingHash`:
         - Return `200 OK` (exact duplicate replay; no duplicate work item created).
         - Include original event summary in response.
       - If `existing.payloadHash !== incomingHash`:
         - Return `409 Conflict` (reusing event identity with differing content).
- **Non-Negotiable**: Never run verification or job projection synchronously inside `POST /events`. Return `202` immediately after durable MongoDB write succeeds!

## Detailed Steps

1. **Create `src/api/routes/events.ts`**:
   - Register `POST /events` route.
   - Inject `EventsRepository`.
   - Implement controller logic matching the exact flow above.
   - Set HTTP response headers and location if appropriate.

## Verification Criteria
- [ ] New valid event returns `202 Accepted`.
- [ ] Submitting the exact same valid event body a second time returns `200 OK`.
- [ ] Submitting an event with the same ID but a changed title/payload returns `409 Conflict`.
- [ ] Submitting an invalid event returns `400 Bad Request`.
- [ ] Submitting a corrected event reusing the previously rejected `eventId` returns `202 Accepted`.
- [ ] No worker processing happens synchronously in this handler.
