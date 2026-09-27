# Task 2.4: Jobs Repository (Conditional Projection & Tombstone)

## Objective
Implement `JobsRepository` encapsulating monotonic projection updates, archive tombstones, archive-before-upsert handling, and cursor-based pagination queries.

## Background & Requirements
Per PRD §5, §6.1, §6.2, §6.3 & IMPLEMENTATION_GUIDE.md §1:
1. **Atomic Monotonic Projection Update**:
   - Single atomic conditional write is the atomicity boundary.
   - For `upsert` with `version`:
     ```ts
     const res = await collection.updateOne(
       {
         tenantId, sourceId, externalJobId,
         currentVersion: { $lt: version },
         // Ensure it doesn't violate an archive tombstone at a higher version
         $or: [
           { status: { $ne: 'archived' } },
           { archivedAtVersion: { $lt: version } }
         ]
       },
       {
         $set: {
           currentVersion: version,
           status: 'active',
           payload,
           updatedAt: now
         },
         $setOnInsert: {
           createdAt: now,
           archivedAtVersion: null
         }
       },
       { upsert: true }
     );
     ```
   - If `res.matchedCount === 0 && res.upsertedCount === 0`:
     - This means the incoming event is stale (a version $\ge$ incoming version already exists, or an archive tombstone $\ge$ incoming version holds).
     - Result is a safe no-op.
2. **Archive Tombstone Handling**:
   - An archive event sets `status: 'archived'`, `payload: null`, and sets `archivedAtVersion = max(archivedAtVersion ?? -1, version)`.
   - Supports **archive-before-upsert**: if an archive event arrives for a job that has never had an upsert, it creates the job document with `status: 'archived'`, `payload: null`, `archivedAtVersion: version`, `currentVersion: version`.
   - Any delayed upsert with `version <= archivedAtVersion` will be rejected by the conditional query and safely resolve as no-op.
   - A subsequent upsert with strictly higher version (`version > archivedAtVersion`) reactivates the job.
3. **Cursor-Based List Query**:
   - `getJobs(filter: { tenantId: string; sourceId?: string; status?: 'active' | 'archived' | 'all'; limit: number; cursor?: string })`:
     - Default status = `active`.
     - Order by `_id ASC` (immutable total ordering).
     - If `cursor` provided, decode base64 ObjectId and add `{ _id: { $gt: decodedId } }`.
     - Limit capped (e.g. max 100).
     - Return `{ items, nextCursor }`.

## Detailed Steps

1. **Create `src/db/jobs-repository.ts`**:
   - Implement class `JobsRepository`:
     - Method `applyUpsert(tenantId: string, sourceId: string, externalJobId: string, version: number, payload: NormalizedJobPayload): Promise<{ applied: boolean }>`
     - Method `applyArchive(tenantId: string, sourceId: string, externalJobId: string, version: number): Promise<{ applied: boolean }>`
     - Method `getJob(tenantId: string, sourceId: string, externalJobId: string): Promise<JobProjectionDoc | null>`
     - Method `listJobs(options: ListJobsOptions): Promise<{ items: JobProjectionDoc[]; nextCursor: string | null }>`

## Verification Criteria
- [ ] Upsert v1 applies successfully $\rightarrow$ `currentVersion: 1`, `status: 'active'`.
- [ ] Out-of-order upsert v2 arrives before v1 $\rightarrow$ v2 sets `currentVersion: 2`. Then when v1 arrives, `matchedCount === 0`, v1 is a no-op, job stays at v2.
- [ ] Archive v3 sets `status: 'archived'`, `currentVersion: 3`, `archivedAtVersion: 3`, `payload: null`.
- [ ] Delayed upsert v2 arrives after archive v3 $\rightarrow$ no-op, job remains archived at v3.
- [ ] Upsert v4 arrives after archive v3 $\rightarrow$ reactivates job with `status: 'active'`, `currentVersion: 4`.
- [ ] Archive arrives before any upsert $\rightarrow$ creates document with `status: 'archived'`.
- [ ] Cursor pagination returns deterministic sequential pages without skipping or duplicates.
