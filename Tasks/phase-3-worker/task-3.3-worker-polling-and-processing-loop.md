# Task 3.3: Worker Polling and Processing Loop
Status: DONE

## Objective
Implement the background worker loop that continuously claims eligible events, checks for staleness against the jobs projection, calls the fake verification provider, applies projection changes, and records attempt history.

## Background & Requirements
Per PRD §6.2 & IMPLEMENTATION_GUIDE.md §3:
1. **Loop Structure**:
   - Each worker instance has a unique `workerId` (e.g. `worker-${hostname}-${pid}-${uuid}`).
   - At least 2 worker instances or competing loops can run concurrently.
   - Polling interval controlled by `WORKER_POLL_INTERVAL_MS` (default 200ms).
   - Clean shutdown mechanism: handles abort signal / stop flag.
2. **Processing Pipeline per Claimed Event**:
   - **Step 1: Staleness Pre-Check**:
     - Query current projection `jobs` for `(tenantId, sourceId, externalJobId)`.
     - If projection exists and:
       - `event.version <= projection.currentVersion`, OR
       - `projection.status === 'archived'` and `event.version <= (projection.archivedAtVersion ?? -1)`:
         $\rightarrow$ Event is **stale**. Skip external verification entirely!
         $\rightarrow$ Mark event `status: 'completed'`, `completedAt: now`, with an attempt record noting `outcome: 'success', error: 'stale_version_skipped'`.
         $\rightarrow$ Release lease. Done.
   - **Step 2: External Verification**:
     - Call `verificationClient.verifyEvent(event.eventId, currentAttemptNumber)`.
     - Record attempt start and result.
   - **Step 3: Outcome Handling**:
     - **Case A: Success**:
       - Apply projection update via `jobsRepository.applyUpsert` (or `applyArchive`).
       - Mark event `completed` with updated `attemptHistory`.
     - **Case B: Retryable Error (429 or 503)**:
       - If `attempts < RETRY_MAX_ATTEMPTS`:
         - Calculate `nextAttemptAt = now + backoff`.
         - Reschedule event to `status: 'pending'`, clear lease, append attempt record.
       - If `attempts >= RETRY_MAX_ATTEMPTS`:
         - Terminal failure: set `status: 'failed'`, `lastError`, append attempt record. Do not touch projection.
     - **Case C: Permanent Error (422)**:
       - Terminal failure immediately: set `status: 'failed'`, `lastError`, append attempt record. Do not retry. Do not touch projection.
3. **Lease Clearance**:
   - All completion or retry writes must atomically unset `claimedBy`, `claimedAt`, and `leaseExpiresAt`.

## Detailed Steps

1. **Create `src/worker/worker-engine.ts`**:
   - Class `WorkerEngine`:
     ```ts
     export class WorkerEngine {
       private running = false;
       private timer: NodeJS.Timeout | null = null;

       constructor(
         private workerId: string,
         private eventsRepo: EventsRepository,
         private jobsRepo: JobsRepository,
         private provider: VerificationClient,
         private options: { pollIntervalMs: number; leaseMs: number; baseDelayMs: number; maxAttempts: number }
       ) {}

       start(): void;
       stop(): Promise<void>;
       async runOnce(): Promise<boolean>; // returns true if an event was claimed and processed
       async processEvent(event: JobEventDoc): Promise<void>;
     }
     ```

2. **Create `src/worker/index.ts`**:
   - Entry point to start worker pool based on `config.WORKER_COUNT`.
   - Binds to process termination signals (`SIGTERM`, `SIGINT`).

## Verification Criteria
- [ ] Claimed events transition from `pending` $\rightarrow$ `claimed` $\rightarrow$ `completed` or `failed`.
- [ ] Stale events skip provider call and complete as no-op.
- [ ] Higher version verification failure does not overwrite lower version active job.
- [ ] Stopping the worker gracefully finishes processing current event before exit.
