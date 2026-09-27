# Task 2.3: Events Repository (Insert-First and Claiming)
Status: TODO

## Objective
Implement `EventsRepository` encapsulating all data operations on the `events` collection: insert-first idempotent writes, duplicate key handling, atomic lease-based claims, attempt record logging, backoff rescheduling, completion, and failure recording.

## Background & Requirements
Per PRD §6.1, §6.2 & IMPLEMENTATION_GUIDE.md §1, §2, §3:
1. **Insert-First Idempotency Pattern**:
   - Never query first (`findOne`), then insert. That creates a race condition under concurrency.
   - Always call `insertOne(doc)` first.
   - If `insertOne` succeeds $\rightarrow$ return `{ status: 'inserted', event: doc }` (leads to `202 Accepted`).
   - If `insertOne` throws Mongo error code 11000:
     - Fetch existing doc by `(tenantId, sourceId, eventId)`.
     - Compare `existing.payloadHash === newDoc.payloadHash`.
     - If matches $\rightarrow$ return `{ status: 'duplicate_replay', event: existing }` (leads to `200 OK`).
     - If differs $\rightarrow$ return `{ status: 'conflict', event: existing }` (leads to `409 Conflict`).
2. **Worker Claim (Atomic Concurrency Boundary)**:
   - Must use `findOneAndUpdate` with lease timeout recovery:
     ```ts
     const now = new Date();
     const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
     const doc = await collection.findOneAndUpdate(
       {
         status: { $in: ['pending', 'claimed'] },
         nextAttemptAt: { $lte: now },
         $or: [
           { status: 'pending' },
           { leaseExpiresAt: { $lt: now } } // abandoned/crashed worker recovery
         ]
       },
       {
         $set: {
           status: 'claimed',
           claimedBy: workerId,
           claimedAt: now,
           leaseExpiresAt
         }
       },
       { sort: { nextAttemptAt: 1 }, returnDocument: 'after' }
     );
     ```
3. **Attempt & Outcome Updates**:
   - `markCompleted(eventId, outcome)`: Set `status: 'completed'`, `completedAt: now`, clear lease, append to `attemptHistory`.
   - `rescheduleRetry(eventId, attemptRecord, nextAttemptAt)`: Increment `attempts`, set `status: 'pending'`, `nextAttemptAt`, clear lease, append to `attemptHistory`.
   - `markFailed(eventId, attemptRecord, errorReason)`: Set `status: 'failed'`, `lastError: errorReason`, clear lease, append to `attemptHistory`.

## Detailed Steps

1. **Create `src/db/events-repository.ts`**:
   - Implement class `EventsRepository`:
     - Method `insertEvent(eventData: CreateEventInput): Promise<InsertEventResult>`
     - Method `claimNextEvent(workerId: string, leaseDurationMs: number): Promise<JobEventDoc | null>`
     - Method `getEvent(tenantId: string, sourceId: string, eventId: string): Promise<JobEventDoc | null>`
     - Method `recordSuccess(id: ObjectId, attempt: AttemptRecord): Promise<void>`
     - Method `recordRetry(id: ObjectId, attempt: AttemptRecord, nextAttemptAt: Date): Promise<void>`
     - Method `recordFailure(id: ObjectId, attempt: AttemptRecord, errorMessage: string): Promise<void>`
     - Method `countPendingOrClaimed(): Promise<number>` (essential for drain detection in demo and tests).

## Verification Criteria
- [ ] Inserting a new event succeeds and returns 'inserted'.
- [ ] Inserting an identical event payload catches error 11000 and returns 'duplicate_replay'.
- [ ] Inserting an event with same identity but different payload returns 'conflict'.
- [ ] `claimNextEvent` safely claims one pending document.
- [ ] Concurrently calling `claimNextEvent` from two simulated workers retrieves distinct documents with zero duplication.
- [ ] Expired lease claims are recovered when `leaseExpiresAt < now`.
